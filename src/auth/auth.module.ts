import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadEnvironment } from '../config/environment.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({ secret: loadEnvironment().JWT_SECRET }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [JwtModule, AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
