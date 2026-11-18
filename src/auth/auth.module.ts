import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { loadEnvironment } from '../config/environment.js';
import { TurnstileModule } from './turnstile.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { AuthTokenService } from './services/auth-token.service.js';

import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: loadEnvironment().JWT_SECRET,
      }),
    }),
    TurnstileModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, JwtAuthGuard, PermissionsGuard],
  exports: [
    JwtModule,
    AuthService,
    AuthTokenService,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
