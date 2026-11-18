import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiMessage } from '../http/api-message.decorator.js';

import { AuthService } from './services/auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

import { LoginDto } from './dto/login.dto.js';
import { ValidateAuthTokenDto } from './dto/validate-auth-token.dto.js';
import { CompleteAccountActivationDto } from './dto/complete-account-activation.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

import type { AuthenticatedUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================================================
  // LOGIN
  // =========================================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiMessage('Login successful')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =========================================================
  // AUTHENTICATED USER
  // =========================================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiMessage('Authenticated user retrieved successfully')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // =========================================================
  // VALIDATE ACCOUNT ACTIVATION
  // =========================================================

  @Get('activation/validate')
  @ApiMessage('Activation token validated')
  validateActivation(@Query() query: ValidateAuthTokenDto) {
    return this.authService.validateActivationToken(query.token);
  }

  @Get('password/reset/validate')
  @ApiMessage('Password reset token validated')
  validatePasswordReset(@Query() query: ValidateAuthTokenDto) {
    return this.authService.validatePasswordResetToken(query.token);
  }

  // =========================================================
  // COMPLETE ACCOUNT ACTIVATION
  // =========================================================

  @Post('activation/complete')
  @HttpCode(HttpStatus.OK)
  @ApiMessage('Account activated successfully')
  completeActivation(@Body() dto: CompleteAccountActivationDto) {
    return this.authService.completeAccountActivation(dto);
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiMessage('Password recovery request processed')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // =========================================================
  // RESET PASSWORD
  // =========================================================

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  @Patch('password/change')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiMessage('Password changed successfully')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
