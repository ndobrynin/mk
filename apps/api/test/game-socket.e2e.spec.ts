import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

process.env.JWT_SECRET ??= 'change-me';

const EVENT_TIMEOUT_MS = 5000;

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

interface RegisteredUser {
  userId: string;
  accessToken: string;
}

interface AckResponse {
  ok: boolean;
  error?: string;
}

interface GamePlayer {
  id: string;
  coins: number;
}

interface GameSnapshot {
  activeIndex: number;
  players: GamePlayer[];
  lastRoll?: { dice: number[] };
}

function waitForEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      EVENT_TIMEOUT_MS,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitWithAck<T>(socket: Socket, event: string, payload?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ack of "${event}"`)),
      EVENT_TIMEOUT_MS,
    );
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

describe('game socket', () => {
  let app: INestApplication | undefined;
  let baseUrl: string;
  const openSockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    for (const socket of openSockets) {
      socket.disconnect();
    }
    await app?.close();
  });

  async function registerAndLogin(label: string): Promise<RegisteredUser> {
    const email = uniqueEmail(label);
    const password = 'a-strong-password';

    await request(app!.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

    const loginResponse = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = loginResponse.body.accessToken as string;

    const meResponse = await request(app!.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    return { userId: meResponse.body.id as string, accessToken };
  }

  async function createRoom(accessToken: string): Promise<{ id: string }> {
    const response = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ maxSeats: 4, isPublic: false })
      .expect(201);

    return { id: response.body.id as string };
  }

  async function joinRoom(accessToken: string, roomId: string): Promise<void> {
    await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
  }

  function connectSocket(accessToken: string, roomId: string): Socket {
    const socket = io(baseUrl, {
      auth: { token: accessToken, roomId },
      transports: ['websocket'],
      forceNew: true,
    });
    openSockets.push(socket);
    return socket;
  }

  it('two JWT clients join by REST, ready up over the socket, and the host start broadcasts a 2-player snapshot', async () => {
    const host = await registerAndLogin('game-host');
    const guest = await registerAndLogin('game-guest');
    const room = await createRoom(host.accessToken);
    await joinRoom(guest.accessToken, room.id);

    const hostSocket = connectSocket(host.accessToken, room.id);
    const guestSocket = connectSocket(guest.accessToken, room.id);

    await Promise.all([waitForEvent(hostSocket, 'room.state'), waitForEvent(guestSocket, 'room.state')]);

    const readyAck = await emitWithAck<AckResponse>(guestSocket, 'room.setReady', { ready: true });
    expect(readyAck.ok).toBe(true);

    const guestSnapshotPromise = waitForEvent<GameSnapshot>(guestSocket, 'game.snapshot');
    const startAck = await emitWithAck<AckResponse>(hostSocket, 'room.start');
    expect(startAck.ok).toBe(true);

    const snapshot = await guestSnapshotPromise;
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.players.map((player) => player.id).sort()).toEqual(
      [host.userId, guest.userId].sort(),
    );
  });

  it('an illegal roll from the non-active player errors without changing state, and the active player can roll', async () => {
    const host = await registerAndLogin('game-roll-host');
    const guest = await registerAndLogin('game-roll-guest');
    const room = await createRoom(host.accessToken);
    await joinRoom(guest.accessToken, room.id);

    const hostSocket = connectSocket(host.accessToken, room.id);
    const guestSocket = connectSocket(guest.accessToken, room.id);

    await Promise.all([waitForEvent(hostSocket, 'room.state'), waitForEvent(guestSocket, 'room.state')]);

    const startSnapshotPromise = waitForEvent<GameSnapshot>(hostSocket, 'game.snapshot');
    const startAck = await emitWithAck<AckResponse>(hostSocket, 'room.start');
    expect(startAck.ok).toBe(true);
    const startedSnapshot = await startSnapshotPromise;

    const activePlayerId = startedSnapshot.players[startedSnapshot.activeIndex].id;
    const activeSocket = activePlayerId === host.userId ? hostSocket : guestSocket;
    const inactiveSocket = activePlayerId === host.userId ? guestSocket : hostSocket;

    const illegalAck = await emitWithAck<AckResponse>(inactiveSocket, 'roll');
    expect(illegalAck.ok).toBe(false);
    expect(illegalAck.error).toBeDefined();

    const rolledSnapshotPromise = waitForEvent<GameSnapshot>(activeSocket, 'game.snapshot');
    const legalAck = await emitWithAck<AckResponse>(activeSocket, 'roll');
    expect(legalAck.ok).toBe(true);

    const rolledSnapshot = await rolledSnapshotPromise;
    expect(rolledSnapshot.lastRoll?.dice.length).toBeGreaterThan(0);
  });

  it('a reconnecting socket for the same userId receives the current game snapshot', async () => {
    const host = await registerAndLogin('game-reconnect-host');
    const guest = await registerAndLogin('game-reconnect-guest');
    const room = await createRoom(host.accessToken);
    await joinRoom(guest.accessToken, room.id);

    const hostSocket = connectSocket(host.accessToken, room.id);
    const guestSocket = connectSocket(guest.accessToken, room.id);

    await Promise.all([waitForEvent(hostSocket, 'room.state'), waitForEvent(guestSocket, 'room.state')]);

    const guestSnapshotPromise = waitForEvent<GameSnapshot>(guestSocket, 'game.snapshot');
    const startAck = await emitWithAck<AckResponse>(hostSocket, 'room.start');
    expect(startAck.ok).toBe(true);
    const startedSnapshot = await guestSnapshotPromise;

    guestSocket.disconnect();

    const reconnected = connectSocket(guest.accessToken, room.id);
    const reconnectSnapshot = await waitForEvent<GameSnapshot>(reconnected, 'game.snapshot');

    expect(reconnectSnapshot).toEqual(startedSnapshot);
  });
});
