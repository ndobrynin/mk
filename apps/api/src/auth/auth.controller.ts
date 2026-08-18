import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { AuthService, LoginResult, RegisteredUser } from './auth.service.js';

interface RegisterBody {
  email: unknown;
  password: unknown;
}

interface LoginBody {
  email: unknown;
  password: unknown;
}

interface RefreshBody {
  refreshToken: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterBody): Promise<RegisteredUser> {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginBody): Promise<LoginResult> {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshBody): Promise<LoginResult> {
    return this.authService.refresh(body.refreshToken);
  }
}
