import { Module } from '@nestjs/common';
import { PublicCatalogController } from './public-catalog.controller.js';
import { PublicCatalogService } from './public-catalog.service.js';
import { PublicQuotationController } from './public-quotation.controller.js';
import { PublicQuotationService } from './public-quotation.service.js';

@Module({
  controllers: [PublicCatalogController, PublicQuotationController],
  providers: [PublicCatalogService, PublicQuotationService],
})
export class PublicModule {}
