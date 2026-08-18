import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Room, RoomSeat } from '@prisma/client';
import { apply, setup, type Command, type GameState, type Rng } from '@kidagrad/engine';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { RoomStateView } from './game.types.js';

const ROOM_STATUS_WAITING = 'waiting';
const ROOM_STATUS_PLAYING = 'playing';
const ROOM_STATUS_FINISHED = 'finished';
const MIN_SEATS_TO_START = 2;

type RoomWithSeats = Room & { seats: RoomSeat[] };

function readyKey(roomId: string): string {
  return `room:${roomId}:ready`;
}

function gameKey(roomId: string): string {
  return `room:${roomId}:game`;
}

const cryptoRng: Rng = {
  nextInt(maxExclusive: number): number {
    return randomInt(maxExclusive);
  },
};

export interface ApplyCommandResult {
  ok: boolean;
  error?: string;
  state?: GameState;
  events?: unknown[];
}

export interface StartGameResult {
  room: RoomStateView;
  state: GameState;
}

@Injectable()
export class GameService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async getRoomOrThrow(roomId: string): Promise<RoomWithSeats> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { seats: true },
    });

    if (!room) {
      throw new NotFoundException('room not found');
    }

    return room;
  }

  async assertSeated(roomId: string, userId: string): Promise<RoomWithSeats> {
    const room = await this.getRoomOrThrow(roomId);

    if (!room.seats.some((seat) => seat.userId === userId)) {
      throw new ForbiddenException('not seated in this room');
    }

    return room;
  }

  async buildRoomStateView(room: RoomWithSeats): Promise<RoomStateView> {
    const readyUserIds = await this.redis.client.smembers(readyKey(room.id));
    const readySet = new Set(readyUserIds);

    return {
      id: room.id,
      code: room.code,
      hostUserId: room.hostUserId,
      maxSeats: room.maxSeats,
      isPublic: room.isPublic,
      status: room.status,
      seats: room.seats
        .slice()
        .sort((a, b) => a.seatIndex - b.seatIndex)
        .map((seat) => ({
          userId: seat.userId,
          seatIndex: seat.seatIndex,
          ready: readySet.has(seat.userId),
        })),
    };
  }

  async setReady(roomId: string, userId: string, ready: boolean): Promise<RoomStateView> {
    const room = await this.assertSeated(roomId, userId);

    if (ready) {
      await this.redis.client.sadd(readyKey(roomId), userId);
    } else {
      await this.redis.client.srem(readyKey(roomId), userId);
    }

    return this.buildRoomStateView(room);
  }

  async startGame(roomId: string, userId: string): Promise<StartGameResult> {
    const room = await this.getRoomOrThrow(roomId);

    if (room.hostUserId !== userId) {
      throw new ForbiddenException('only the host can start the game');
    }

    if (room.status !== ROOM_STATUS_WAITING) {
      throw new ForbiddenException('room is not waiting');
    }

    if (room.seats.length < MIN_SEATS_TO_START) {
      throw new ForbiddenException('at least 2 seats must be occupied to start');
    }

    const playerIds = room.seats
      .slice()
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((seat) => seat.userId);

    const state = setup(playerIds);

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { status: ROOM_STATUS_PLAYING },
      include: { seats: true },
    });

    await this.redis.client.set(gameKey(roomId), JSON.stringify(state));

    return { room: await this.buildRoomStateView(updated), state };
  }

  async getSnapshot(roomId: string): Promise<GameState | undefined> {
    const raw = await this.redis.client.get(gameKey(roomId));
    return raw ? (JSON.parse(raw) as GameState) : undefined;
  }

  async applyCommand(roomId: string, userId: string, command: Command): Promise<ApplyCommandResult> {
    const state = await this.getSnapshot(roomId);

    if (!state) {
      return { ok: false, error: 'game has not started' };
    }

    const players = state.players as Array<{ id: string }>;
    const activeIndex = state.activeIndex ?? 0;
    const activePlayer = players[activeIndex];

    if (!activePlayer || activePlayer.id !== userId) {
      return { ok: false, error: 'not your turn' };
    }

    const result = apply(state, command, cryptoRng);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    await this.redis.client.set(gameKey(roomId), JSON.stringify(result.state));

    if (result.state.phase === 'gameOver') {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: ROOM_STATUS_FINISHED },
      });
    }

    return { ok: true, state: result.state, events: result.events };
  }
}
