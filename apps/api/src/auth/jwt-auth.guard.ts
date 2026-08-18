import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

const INVALID_TOKEN_MESSAGE = 'invalid or missing token';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

interface RequestWithUser {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

function extractBearerToken(authHeader: unknown): string | undefined {
  if (typeof authHeader !== 'string') {
    return undefined;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return undefined;
  }

  return token;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      const payload = jwt.verify(token, jwtSecret);

      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
      }

      request.user = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      };

      return true;
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
  }
}
