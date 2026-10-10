import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  code: string;
}
