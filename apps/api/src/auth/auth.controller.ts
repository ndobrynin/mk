import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { AuthService, RegisteredUser } from './auth.service.js';

interface RegisterBody {
  email: unknown;
  password: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterBody): Promise<RegisteredUser> {
    return this.authService.register(body.email, body.password);
  }
}
