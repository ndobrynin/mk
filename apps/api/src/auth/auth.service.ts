import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;
const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_BYTES = 32;
const INVALID_CREDENTIALS_MESSAGE = 'invalid email or password';
const INVALID_REFRESH_TOKEN_MESSAGE = 'invalid refresh token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RegisteredUser extends TokenPair {
  id: string;
  email: string;
}

export type LoginResult = TokenPair;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(email: unknown, password: unknown): Promise<RegisteredUser> {
    if (typeof email !== 'string' || email.length === 0) {
      throw new BadRequestException('email is required');
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });

      const tokenPair = await this.issueTokenPair(user.id, user.email);

      return { id: user.id, email: user.email as string, ...tokenPair };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR
      ) {
        throw new ConflictException('email already registered');
      }

      throw error;
    }
  }

  async login(email: unknown, password: unknown): Promise<LoginResult> {
    if (typeof email !== 'string' || email.length === 0) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (typeof password !== 'string' || password.length === 0) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash as string);

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.issueTokenPair(user.id, user.email);
  }

  async refresh(refreshToken: unknown): Promise<LoginResult> {
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN_MESSAGE);
    }

    return this.issueTokenPair(stored.userId, stored.user.email);
  }

  private async issueTokenPair(userId: string, email: string | null): Promise<TokenPair> {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = jwt.sign({ sub: userId, email, jti: randomUUID() }, jwtSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
