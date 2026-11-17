import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';

import { ListLogisticsTransfersDto } from './dto/list-logistics-transfers.dto.js';
import { AssignLogisticsTransferDto } from './dto/assign-logistics-transfer.dto.js';

import { LOGISTICS_PERMISSIONS } from './logistics-permissions.js';

import { LogisticsListService } from './services/logistics-list.service.js';
import { LogisticsAssignmentService } from './services/logistics-assignment.service.js';

@Controller('admin/logistics/transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogisticsController {
  constructor(
    private readonly logisticsListService: LogisticsListService,
    private readonly logisticsAssignmentService: LogisticsAssignmentService,
  ) {}

  // =========================================================
  // LIST LOGISTICS TRANSFERS
  // =========================================================

  @Get()
  @RequirePermissions(LOGISTICS_PERMISSIONS.LIST)
  @ApiMessage('Logistics transfers retrieved successfully')
  findAll(@Query() query: ListLogisticsTransfersDto) {
    return this.logisticsListService.findAll(query);
  }

  // =========================================================
  // ASSIGN OPERATOR AND UNIT
  // =========================================================

  @Patch(':id/assignment')
  @RequirePermissions(LOGISTICS_PERMISSIONS.UPDATE)
  @ApiMessage('Transfer assignment updated successfully')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLogisticsTransferDto,
  ) {
    return this.logisticsAssignmentService.assign(id, dto);
  }
}
