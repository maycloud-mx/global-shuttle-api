import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TransferPointsController } from './transfer-points.controller.js';
import { TransferPointsService } from './transfer-points.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TransferPointsController],
  providers: [TransferPointsService],
  exports: [TransferPointsService],
})
export class TransferPointsModule {}
