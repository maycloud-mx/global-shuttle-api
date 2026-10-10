import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CurrenciesController } from './currencies.controller.js';
import { CurrenciesService } from './currencies.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
