import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { ChangeTransferPointStatusDto } from './dto/change-transfer-point-status.dto.js';
import { CreateTransferPointDto } from './dto/create-transfer-point.dto.js';
import { ListTransferPointsDto } from './dto/list-transfer-points.dto.js';
import { UpdateTransferPointDto } from './dto/update-transfer-point.dto.js';
import { TRANSFER_POINT_PERMISSIONS } from './transfer-point-permissions.js';
import { TransferPointsService } from './transfer-points.service.js';

@Controller('admin/transfer-points')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransferPointsController {
  constructor(private readonly transferPointsService: TransferPointsService) {}

  @Post()
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.CREATE)
  @ApiMessage('Transfer point created successfully')
  create(
    @Body() dto: CreateTransferPointDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferPointsService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.LIST)
  @ApiMessage('Transfer points retrieved successfully')
  findAll(@Query() query: ListTransferPointsDto) {
    return this.transferPointsService.findAll(query);
  }

  @Get('airports')
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.LIST)
  @ApiMessage('Airport transfer points retrieved successfully')
  findAirports() {
    return this.transferPointsService.findAirports();
  }

  @Get(':id')
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.VIEW)
  @ApiMessage('Transfer point retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transferPointsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.UPDATE)
  @ApiMessage('Transfer point updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransferPointDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferPointsService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions(TRANSFER_POINT_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Transfer point status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeTransferPointStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transferPointsService.changeStatus(id, dto, user.id);
  }
}
