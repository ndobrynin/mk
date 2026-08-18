import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;
const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';

export interface RegisteredUser {
  id: string;
  email: string;
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
}
