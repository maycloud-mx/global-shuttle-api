import { Body, Controller, Post } from '@nestjs/common';
import { ApiMessage } from '../http/api-message.decorator.js';
import { PublicQuoteOptionsDto } from './dto/public-quote-options.dto.js';
import { PublicQuotationService } from './public-quotation.service.js';

@Controller('public/quotes')
export class PublicQuotationController {
  constructor(
    private readonly publicQuotationService: PublicQuotationService,
  ) {}

  @Post('options')
  @ApiMessage('Available quote options retrieved successfully')
  findOptions(@Body() dto: PublicQuoteOptionsDto) {
    return this.publicQuotationService.findOptions(dto);
  }
}
