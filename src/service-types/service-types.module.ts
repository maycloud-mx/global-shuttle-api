import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ServiceTypesController } from './service-types.controller.js';
import { ServiceTypesService } from './service-types.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
  exports: [ServiceTypesService],
})
export class ServiceTypesModule {}
