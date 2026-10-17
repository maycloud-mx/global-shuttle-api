import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CountriesController } from './countries.controller.js';
import { CountriesService } from './countries.service.js';

@Module({
  imports: [AuthModule],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}