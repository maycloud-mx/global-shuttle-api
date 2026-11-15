import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { RatesController } from './rates.controller.js';
import { RatesService } from './rates.service.js';
import { RatesBulkService } from './rates-bulk.service.js';
import { RatesImportService } from './rates-import.service.js';
import { RatesCoverageService } from './rates-coverage.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RatesController],
  providers: [
    RatesService,
    RatesBulkService,
    RatesImportService,
    RatesCoverageService,
  ],
  exports: [RatesService],
})
export class RatesModule {}
