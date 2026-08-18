import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;
const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';
const ACCESS_TOKEN_TTL = '15m';
const INVALID_CREDENTIALS_MESSAGE = 'invalid email or password';

export interface RegisteredUser {
  id: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
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

      return { id: user.id, email: user.email as string };
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

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const accessToken = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    return { accessToken };
  }
}
