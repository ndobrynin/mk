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

describe('POST /auth/login', () => {
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

  it('returns a JWT accessToken and a refreshToken after register then login', async () => {
    const email = uniqueEmail('login-ok');
    const password = 'a-strong-password';

    await request(app!.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const response = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.split('.').length).toBe(3);
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('returns 401 with the wrong password', async () => {
    const email = uniqueEmail('login-wrong-password');
    const password = 'a-strong-password';

    await request(app!.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const response = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'not-the-right-password' });

    expect(response.status).toBe(401);
  });

  it('returns 401 with the same message for an unknown email as for a wrong password', async () => {
    const email = uniqueEmail('login-message-check');
    const password = 'a-strong-password';

    await request(app!.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const wrongPasswordResponse = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'not-the-right-password' });

    const unknownEmailResponse = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail('login-unknown'), password });

    expect(wrongPasswordResponse.status).toBe(401);
    expect(unknownEmailResponse.status).toBe(401);
    expect(unknownEmailResponse.body.message).toBe(wrongPasswordResponse.body.message);
  });
});
