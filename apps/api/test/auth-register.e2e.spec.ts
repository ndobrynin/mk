import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe('POST /auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with { id, email } and no passwordHash', async () => {
    const email = uniqueEmail('register');

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'a-strong-password' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ email });
    expect(typeof response.body.id).toBe('string');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('stores a bcrypt hash in the DB, not the plaintext password', async () => {
    const email = uniqueEmail('hash-check');
    const password = 'a-strong-password';

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password });

    const user = await prisma.user.findUnique({ where: { id: response.body.id as string } });

    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toBe(password);
  });

  it('returns 409 when the email is already registered', async () => {
    const email = uniqueEmail('duplicate');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'a-strong-password' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'another-password' });

    expect(response.status).toBe(409);
  });

  it('returns 400 when the password is shorter than 8 characters', async () => {
    const email = uniqueEmail('short-password');

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'short' });

    expect(response.status).toBe(400);
  });
});
