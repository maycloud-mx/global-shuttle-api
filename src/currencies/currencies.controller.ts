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
import { CURRENCY_PERMISSIONS } from './currency-permissions.js';
import { CurrenciesService } from './currencies.service.js';
import { ChangeCurrencyStatusDto } from './dto/change-currency-status.dto.js';
import { CreateCurrencyDto } from './dto/create-currency.dto.js';
import { ListCurrenciesDto } from './dto/list-currencies.dto.js';
import { UpdateCurrencyDto } from './dto/update-currency.dto.js';

@Controller('admin/currencies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  @RequirePermissions(CURRENCY_PERMISSIONS.CREATE)
  @ApiMessage('Currency created successfully')
  create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(dto);
  }

  @Get()
  @RequirePermissions(CURRENCY_PERMISSIONS.LIST)
  @ApiMessage('Currencies retrieved successfully')
  findAll(@Query() query: ListCurrenciesDto) {
    return this.currenciesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(CURRENCY_PERMISSIONS.VIEW)
  @ApiMessage('Currency retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.currenciesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(CURRENCY_PERMISSIONS.UPDATE)
  @ApiMessage('Currency updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(CURRENCY_PERMISSIONS.CHANGE_STATUS)
  @ApiMessage('Currency status updated successfully')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCurrencyStatusDto,
  ) {
    return this.currenciesService.changeStatus(id, dto);
  }
}
