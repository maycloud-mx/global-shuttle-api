import { Body, Controller, Ip, Post } from '@nestjs/common';
import { RATE_LIMIT_POLICIES } from '../auth/rate-limit.config.js';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { CreateContactMessageDto } from './dto/create-contact-message.dto.js';

@Controller('public/contact-messages')
export class PublicContactMessagesController {
  constructor(private readonly contactMessages: ContactMessagesService) {}

  @Post()
  @RateLimit(RATE_LIMIT_POLICIES.contactSubmission)
  @ApiMessage('Contact message received')
  create(@Body() dto: CreateContactMessageDto, @Ip() ip?: string) {
    return this.contactMessages.create(dto, ip);
  }
}
