import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

process.env.JWT_SECRET ??= 'change-me';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('rooms REST', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerAndLogin(label: string): Promise<string> {
    const email = uniqueEmail(label);
    const password = 'a-strong-password';

    await request(app!.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

    const loginResponse = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return loginResponse.body.accessToken as string;
  }

  it('creates a public room with the host seated at index 0 and lists it', async () => {
    const hostToken = await registerAndLogin('rooms-create-host');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 4, isPublic: true })
      .expect(201);

    expect(typeof createResponse.body.id).toBe('string');
    expect(typeof createResponse.body.code).toBe('string');
    expect(createResponse.body.code.length).toBe(6);
    expect(createResponse.body.status).toBe('waiting');
    expect(createResponse.body.seats).toEqual([
      { userId: expect.any(String), seatIndex: 0, isBot: false },
    ]);

    const listResponse = await request(app!.getHttpServer())
      .get('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(200);

    const listedRoom = (listResponse.body as Array<{ id: string }>).find(
      (room) => room.id === createResponse.body.id,
    );

    expect(listedRoom).toBeDefined();
  });

  it('lets a second player join by room id and a third join by code', async () => {
    const hostToken = await registerAndLogin('rooms-join-host');
    const secondToken = await registerAndLogin('rooms-join-second');
    const thirdToken = await registerAndLogin('rooms-join-third');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 4, isPublic: false })
      .expect(201);

    const roomId = createResponse.body.id as string;
    const roomCode = createResponse.body.code as string;

    const joinByIdResponse = await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(201);

    expect(joinByIdResponse.body.seats).toHaveLength(2);
    expect(joinByIdResponse.body.seats).toEqual(
      expect.arrayContaining([{ userId: expect.any(String), seatIndex: 1, isBot: false }]),
    );

    const joinByCodeResponse = await request(app!.getHttpServer())
      .post('/rooms/join')
      .set('Authorization', `Bearer ${thirdToken}`)
      .send({ code: roomCode })
      .expect(201);

    expect(joinByCodeResponse.body.seats).toHaveLength(3);
    expect(joinByCodeResponse.body.seats).toEqual(
      expect.arrayContaining([{ userId: expect.any(String), seatIndex: 2, isBot: false }]),
    );

    const getResponse = await request(app!.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(200);

    expect(getResponse.body.seats).toHaveLength(3);
  });

  it('returns 409 for a fifth player on a full maxSeats=4 room and 401 without a Bearer token', async () => {
    const hostToken = await registerAndLogin('rooms-full-host');
    const playerTokens = await Promise.all([
      registerAndLogin('rooms-full-p1'),
      registerAndLogin('rooms-full-p2'),
      registerAndLogin('rooms-full-p3'),
    ]);
    const fifthToken = await registerAndLogin('rooms-full-p4');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 4, isPublic: false })
      .expect(201);

    const roomId = createResponse.body.id as string;

    for (const token of playerTokens) {
      await request(app!.getHttpServer())
        .post(`/rooms/${roomId}/join`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    }

    await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${fifthToken}`)
      .expect(409);

    await request(app!.getHttpServer()).post(`/rooms/${roomId}/join`).expect(401);
  });

  it('returns 404 for an unknown room id and an unknown join code', async () => {
    const hostToken = await registerAndLogin('rooms-404-host');

    await request(app!.getHttpServer())
      .get('/rooms/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(404);

    await request(app!.getHttpServer())
      .post('/rooms/join')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ code: 'ZZZZZZ' })
      .expect(404);
  });

  it('marks a waiting room as finished when the host leaves', async () => {
    const hostToken = await registerAndLogin('rooms-leave-host');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 2, isPublic: false })
      .expect(201);

    const roomId = createResponse.body.id as string;

    await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(201);

    const getResponse = await request(app!.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(200);

    expect(getResponse.body.status).toBe('finished');
  });

  it('lets the host add a bot onto a free seat and marks isBot', async () => {
    const hostToken = await registerAndLogin('rooms-add-bot-host');
    const guestToken = await registerAndLogin('rooms-add-bot-guest');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 3, isPublic: false })
      .expect(201);

    const roomId = createResponse.body.id as string;

    const addBotResponse = await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/bots`)
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(201);

    expect(addBotResponse.body.seats).toHaveLength(2);
    expect(addBotResponse.body.seats).toEqual(
      expect.arrayContaining([
        { userId: expect.any(String), seatIndex: 0, isBot: false },
        { userId: expect.any(String), seatIndex: 1, isBot: true },
      ]),
    );

    await request(app!.getHttpServer())
      .post(`/rooms/${roomId}/bots`)
      .set('Authorization', `Bearer ${guestToken}`)
      .expect(403);
  });

  it('fills empty seats with bots when fillBots is true on create', async () => {
    const hostToken = await registerAndLogin('rooms-fill-bots-host');

    const createResponse = await request(app!.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ maxSeats: 2, isPublic: false, fillBots: true })
      .expect(201);

    expect(createResponse.body.seats).toHaveLength(2);
    expect(createResponse.body.seats).toEqual(
      expect.arrayContaining([
        { userId: expect.any(String), seatIndex: 0, isBot: false },
        { userId: expect.any(String), seatIndex: 1, isBot: true },
      ]),
    );
  });
});
