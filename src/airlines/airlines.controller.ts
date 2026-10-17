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

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';

import { AIRLINE_PERMISSIONS } from './airline-permissions.js';
import { AirlinesService } from './airlines.service.js';

import { ChangeAirlineStatusDto } from './dto/change-airline-status.dto.js';
import { CreateAirlineDto } from './dto/create-airline.dto.js';
import { ListAirlinesDto } from './dto/list-airlines.dto.js';
import { UpdateAirlineDto } from './dto/update-airline.dto.js';

@Controller('admin/airlines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AirlinesController {
  constructor(
    private readonly airlinesService: AirlinesService,
  ) {}

  @Post()
  @RequirePermissions(AIRLINE_PERMISSIONS.CREATE)
  @ApiMessage('Airline created successfully')
  create(@Body() dto: CreateAirlineDto) {
    return this.airlinesService.create(dto);
  }

  @Get()
  @RequirePermissions(AIRLINE_PERMISSIONS.LIST)
  @ApiMessage('Airlines retrieved successfully')
  findAll(@Query() query: ListAirlinesDto) {
    return this.airlinesService.findAll(query);
  }

  @Get('options')
  @RequirePermissions(AIRLINE_PERMISSIONS.LIST)
  @ApiMessage('Airline options retrieved successfully')
  findOptions() {
    return this.airlinesService.findOptions();
  }

  @Get(':id')
  @RequirePermissions(AIRLINE_PERMISSIONS.VIEW)
  @ApiMessage('Airline retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.airlinesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(AIRLINE_PERMISSIONS.UPDATE)
  @ApiMessage('Airline updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAirlineDto,
  ) {
    return this.airlinesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(AIRLINE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Airline status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeAirlineStatusDto,
  ) {
    return this.airlinesService.changeStatus(id, dto);
  }
}
