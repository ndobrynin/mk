import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt-auth.guard.js';

interface RequestWithUser {
  user: AuthenticatedUser;
}

@Controller()
export class MeController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithUser): AuthenticatedUser {
    return req.user;
  }
}
