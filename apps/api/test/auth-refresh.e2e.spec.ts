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

async function registerAndLogin(
  app: INestApplication,
  label: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const email = uniqueEmail(label);
  const password = 'a-strong-password';

  await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return { accessToken: response.body.accessToken, refreshToken: response.body.refreshToken };
}

describe('POST /auth/refresh', () => {
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

  it('rotates the refresh token and issues a new access token', async () => {
    const { accessToken, refreshToken } = await registerAndLogin(app!, 'refresh-rotate');

    const response = await request(app!.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.split('.').length).toBe(3);
    expect(response.body.accessToken).not.toBe(accessToken);
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.refreshToken).not.toBe(refreshToken);
  });

  it('rejects reuse of an already-rotated refresh token with 401', async () => {
    const { refreshToken } = await registerAndLogin(app!, 'refresh-reuse');

    await request(app!.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const reuseResponse = await request(app!.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(reuseResponse.status).toBe(401);
  });

  it('rejects an unknown refresh token with 401', async () => {
    const response = await request(app!.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });

    expect(response.status).toBe(401);
  });
});
