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

describe('GET /me', () => {
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

  it('returns 200 with the caller own id and email for a valid access token', async () => {
    const email = uniqueEmail('me-ok');
    const password = 'a-strong-password';

    await request(app!.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const loginResponse = await request(app!.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app!.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(typeof response.body.id).toBe('string');
    expect(response.body.email).toBe(email);
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const response = await request(app!.getHttpServer()).get('/me');

    expect(response.status).toBe(401);
  });

  it('returns 401 for a garbage token', async () => {
    const response = await request(app!.getHttpServer())
      .get('/me')
      .set('Authorization', 'Bearer not-a-real-jwt');

    expect(response.status).toBe(401);
  });
});
