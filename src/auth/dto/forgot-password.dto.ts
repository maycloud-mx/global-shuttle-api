import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  turnstileToken: string;
}
