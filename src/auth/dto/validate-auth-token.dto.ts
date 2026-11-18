import { IsString, Matches } from 'class-validator';

export class ValidateAuthTokenDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;
}
