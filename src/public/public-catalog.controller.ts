import { Controller, Get, Query } from '@nestjs/common';
import { ApiMessage } from '../http/api-message.decorator.js';
import { PublicTransferPointsQueryDto } from './dto/public-transfer-points-query.dto.js';
import { PublicCatalogService } from './public-catalog.service.js';

@Controller('public')
export class PublicCatalogController {
  constructor(private readonly publicCatalogService: PublicCatalogService) {}

  @Get('currencies')
  @ApiMessage('Active currencies retrieved successfully')
  findCurrencies() {
    return this.publicCatalogService.findCurrencies();
  }

  @Get('service-types')
  @ApiMessage('Active service types retrieved successfully')
  findServiceTypes() {
    return this.publicCatalogService.findServiceTypes();
  }

  @Get('countries')
  @ApiMessage('Active countries retrieved successfully')
  findCountries() {
    return this.publicCatalogService.findCountries();
  }

  @Get('airlines')
  @ApiMessage('Active airlines retrieved successfully')
  findAirlines() {
    return this.publicCatalogService.findAirlines();
  }

  @Get('transfer-points')
  @ApiMessage('Active transfer points retrieved successfully')
  findTransferPoints(@Query() query: PublicTransferPointsQueryDto) {
    return this.publicCatalogService.findTransferPoints(
      query.originTransferPointId,
    );
  }
}
