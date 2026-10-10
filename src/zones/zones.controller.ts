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
import { ChangeZoneStatusDto } from './dto/change-zone-status.dto.js';
import { CreateZoneDto } from './dto/create-zone.dto.js';
import { ListZonesDto } from './dto/list-zones.dto.js';
import { UpdateZoneDto } from './dto/update-zone.dto.js';
import { ZONE_PERMISSIONS } from './zone-permissions.js';
import { ZonesService } from './zones.service.js';

@Controller('admin/zones')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @RequirePermissions(ZONE_PERMISSIONS.CREATE)
  @ApiMessage('Zone created successfully')
  create(@Body() dto: CreateZoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.zonesService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(ZONE_PERMISSIONS.LIST)
  @ApiMessage('Zones retrieved successfully')
  findAll(@Query() query: ListZonesDto) {
    return this.zonesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(ZONE_PERMISSIONS.VIEW)
  @ApiMessage('Zone retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ZONE_PERMISSIONS.UPDATE)
  @ApiMessage('Zone updated successfully')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(ZONE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Zone status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeZoneStatusDto,
  ) {
    return this.zonesService.changeStatus(id, dto);
  }
}
