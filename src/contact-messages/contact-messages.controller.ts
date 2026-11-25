import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { ListContactMessagesDto } from './dto/list-contact-messages.dto.js';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto.js';

@Controller('admin/contact-messages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContactMessagesController {
  constructor(private readonly contactMessages: ContactMessagesService) {}

  @Get()
  @RequirePermissions('contact-messages:list')
  @ApiMessage('Contact messages retrieved successfully')
  findAll(@Query() query: ListContactMessagesDto) {
    return this.contactMessages.findAll(query);
  }

  @Patch(':id/status')
  @RequirePermissions('contact-messages:change-status')
  @ApiMessage('Contact message marked as read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: UpdateContactMessageStatusDto,
  ) {
    return this.contactMessages.markRead(id);
  }
}
