import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TurnstileModule } from '../auth/turnstile.module.js';
import { ContactMessagesController } from './contact-messages.controller.js';
import { ContactMessagesService } from './contact-messages.service.js';
import { PublicContactMessagesController } from './public-contact-messages.controller.js';

@Module({
  imports: [AuthModule, TurnstileModule],
  controllers: [ContactMessagesController, PublicContactMessagesController],
  providers: [ContactMessagesService],
})
export class ContactMessagesModule {}
