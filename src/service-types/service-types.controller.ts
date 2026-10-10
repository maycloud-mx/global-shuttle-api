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
import { ChangeServiceTypeStatusDto } from './dto/change-service-type-status.dto.js';
import { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import { ListServiceTypesDto } from './dto/list-service-types.dto.js';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';
import { SERVICE_TYPE_PERMISSIONS } from './service-type-permissions.js';
import { ServiceTypesService } from './service-types.service.js';

@Controller('admin/service-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Post()
  @RequirePermissions(SERVICE_TYPE_PERMISSIONS.CREATE)
  @ApiMessage('Service type created successfully')
  create(@Body() dto: CreateServiceTypeDto) {
    return this.serviceTypesService.create(dto);
  }

  @Get()
  @RequirePermissions(SERVICE_TYPE_PERMISSIONS.LIST)
  @ApiMessage('Service types retrieved successfully')
  findAll(@Query() query: ListServiceTypesDto) {
    return this.serviceTypesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(SERVICE_TYPE_PERMISSIONS.VIEW)
  @ApiMessage('Service type retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceTypesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(SERVICE_TYPE_PERMISSIONS.UPDATE)
  @ApiMessage('Service type updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.serviceTypesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(SERVICE_TYPE_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Service type status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeServiceTypeStatusDto,
  ) {
    return this.serviceTypesService.changeStatus(id, dto);
  }
}
