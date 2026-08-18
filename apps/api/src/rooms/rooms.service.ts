import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Room, RoomSeat } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_SEATS = 2;
const MAX_SEATS = 4;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_GENERATION_ATTEMPTS = 10;
const ROOM_STATUS_WAITING = 'waiting';
const ROOM_STATUS_PLAYING = 'playing';
const ROOM_STATUS_FINISHED = 'finished';
const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';

export interface RoomSeatView {
  userId: string;
  seatIndex: number;
}

export interface RoomView {
  id: string;
  code: string;
  hostUserId: string;
  maxSeats: number;
  isPublic: boolean;
  status: string;
  createdAt: Date;
  seats: RoomSeatView[];
}

type RoomWithSeats = Room & { seats: RoomSeat[] };

function toRoomView(room: RoomWithSeats): RoomView {
  return {
    id: room.id,
    code: room.code,
    hostUserId: room.hostUserId,
    maxSeats: room.maxSeats,
    isPublic: room.isPublic,
    status: room.status,
    createdAt: room.createdAt,
    seats: room.seats
      .slice()
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((seat) => ({ userId: seat.userId, seatIndex: seat.seatIndex })),
  };
}

function generateRoomCode(): string {
  let code = '';

  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }

  return code;
}

function firstFreeSeatIndex(occupied: readonly number[], maxSeats: number): number | undefined {
  for (let index = 0; index < maxSeats; index += 1) {
    if (!occupied.includes(index)) {
      return index;
    }
  }

  return undefined;
}

@Injectable()
export class RoomsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createRoom(hostUserId: string, maxSeats: unknown, isPublic: unknown): Promise<RoomView> {
    if (typeof maxSeats !== 'number' || !Number.isInteger(maxSeats)) {
      throw new BadRequestException('maxSeats must be an integer');
    }

    if (maxSeats < MIN_SEATS || maxSeats > MAX_SEATS) {
      throw new BadRequestException(`maxSeats must be between ${MIN_SEATS} and ${MAX_SEATS}`);
    }

    if (typeof isPublic !== 'boolean') {
      throw new BadRequestException('isPublic must be a boolean');
    }

    for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
      const code = generateRoomCode();

      try {
        const room = await this.prisma.room.create({
          data: {
            code,
            hostUserId,
            maxSeats,
            isPublic,
            status: ROOM_STATUS_WAITING,
            seats: {
              create: { userId: hostUserId, seatIndex: 0 },
            },
          },
          include: { seats: true },
        });

        return toRoomView(room);
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error as Prisma.PrismaClientKnownRequestError).code === PRISMA_UNIQUE_CONSTRAINT_ERROR
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('could not generate a unique room code');
  }

  async listPublicWaitingRooms(): Promise<RoomView[]> {
    const rooms = await this.prisma.room.findMany({
      where: { isPublic: true, status: ROOM_STATUS_WAITING },
      include: { seats: true },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map(toRoomView);
  }

  async getRoomById(roomId: string): Promise<RoomView> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { seats: true },
    });

    if (!room) {
      throw new NotFoundException('room not found');
    }

    return toRoomView(room);
  }

  async joinRoomById(userId: string, roomId: string): Promise<RoomView> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { seats: true },
    });

    if (!room) {
      throw new NotFoundException('room not found');
    }

    return this.seatUserInRoom(userId, room);
  }

  async joinRoomByCode(userId: string, code: unknown): Promise<RoomView> {
    if (typeof code !== 'string' || code.length === 0) {
      throw new BadRequestException('code is required');
    }

    const room = await this.prisma.room.findUnique({
      where: { code },
      include: { seats: true },
    });

    if (!room) {
      throw new NotFoundException('room not found');
    }

    return this.seatUserInRoom(userId, room);
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { seats: true },
    });

    if (!room) {
      throw new NotFoundException('room not found');
    }

    const seat = room.seats.find((candidate) => candidate.userId === userId);

    if (!seat) {
      throw new NotFoundException('not seated in this room');
    }

    await this.prisma.roomSeat.delete({ where: { id: seat.id } });

    if (room.hostUserId === userId && room.status === ROOM_STATUS_WAITING) {
      await this.prisma.room.update({
        where: { id: room.id },
        data: { status: ROOM_STATUS_FINISHED },
      });
    }
  }

  private async seatUserInRoom(userId: string, room: RoomWithSeats): Promise<RoomView> {
    if (room.status === ROOM_STATUS_PLAYING || room.status === ROOM_STATUS_FINISHED) {
      throw new ConflictException('room is not accepting new players');
    }

    if (room.seats.some((seat) => seat.userId === userId)) {
      throw new ConflictException('already seated in this room');
    }

    const occupiedIndexes = room.seats.map((seat) => seat.seatIndex);
    const seatIndex = firstFreeSeatIndex(occupiedIndexes, room.maxSeats);

    if (seatIndex === undefined) {
      throw new ConflictException('room is full');
    }

    try {
      await this.prisma.roomSeat.create({
        data: { roomId: room.id, userId, seatIndex },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Prisma.PrismaClientKnownRequestError).code === PRISMA_UNIQUE_CONSTRAINT_ERROR
      ) {
        throw new ConflictException('room is full');
      }

      throw error;
    }

    const updated = await this.prisma.room.findUnique({
      where: { id: room.id },
      include: { seats: true },
    });

    if (!updated) {
      throw new NotFoundException('room not found');
    }

    return toRoomView(updated);
  }
}
