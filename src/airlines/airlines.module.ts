import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AirlinesController } from './airlines.controller.js';
import { AirlinesService } from './airlines.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AirlinesController],
  providers: [AirlinesService],
  exports: [AirlinesService],
})
export class AirlinesModule {}