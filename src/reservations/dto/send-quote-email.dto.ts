import { IsEmail, MaxLength } from 'class-validator';

export class SendQuoteEmailDto {
  @IsEmail()
  @MaxLength(191)
  email: string;
}
