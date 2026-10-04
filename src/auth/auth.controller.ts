import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiMessage } from '../http/api-message.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('bootstrap-user')
  @ApiMessage('Initial user generated successfully')
  createBootstrapUser() {
    return this.authService.createBootstrapUser();
  }

  @Post('login')
  @ApiMessage('Login successful')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiMessage('Authenticated user retrieved successfully')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
