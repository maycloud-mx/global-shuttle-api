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
import { ChangeRateStatusDto } from './dto/change-rate-status.dto.js';
import { CreateRateDto } from './dto/create-rate.dto.js';
import { ListRatesDto } from './dto/list-rates.dto.js';
import { UpdateRateDto } from './dto/update-rate.dto.js';
import { RATE_PERMISSIONS } from './rate-permissions.js';
import { RatesService } from './rates.service.js';

@Controller('admin/rates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @RequirePermissions(RATE_PERMISSIONS.CREATE)
  @ApiMessage('Rate created successfully')
  create(@Body() dto: CreateRateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ratesService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(RATE_PERMISSIONS.LIST)
  @ApiMessage('Rates retrieved successfully')
  findAll(@Query() query: ListRatesDto) {
    return this.ratesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(RATE_PERMISSIONS.VIEW)
  @ApiMessage('Rate retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ratesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(RATE_PERMISSIONS.UPDATE)
  @ApiMessage('Rate updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratesService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions(RATE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Rate status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ratesService.changeStatus(id, dto, user.id);
  }
}
