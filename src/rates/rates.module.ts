import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RatesController } from './rates.controller.js';
import { RatesService } from './rates.service.js';
import { RatesCoverageService } from './rates-coverage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RatesController],
  providers: [RatesService, RatesCoverageService],
  exports: [RatesService],
})
export class RatesModule {}
