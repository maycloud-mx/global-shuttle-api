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

import { COUNTRY_PERMISSIONS } from './country-permissions.js';
import { CountriesService } from './countries.service.js';

import { ChangeCountryStatusDto } from './dto/change-country-status.dto.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { ListCountriesDto } from './dto/list-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';

@Controller('admin/countries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
  ) {}

  @Post()
  @RequirePermissions(COUNTRY_PERMISSIONS.CREATE)
  @ApiMessage('Country created successfully')
  create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @Get()
  @RequirePermissions(COUNTRY_PERMISSIONS.LIST)
  @ApiMessage('Countries retrieved successfully')
  findAll(@Query() query: ListCountriesDto) {
    return this.countriesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(COUNTRY_PERMISSIONS.VIEW)
  @ApiMessage('Country retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.countriesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(COUNTRY_PERMISSIONS.UPDATE)
  @ApiMessage('Country updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCountryDto,
  ) {
    return this.countriesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(COUNTRY_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Country status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCountryStatusDto,
  ) {
    return this.countriesService.changeStatus(id, dto);
  }
}