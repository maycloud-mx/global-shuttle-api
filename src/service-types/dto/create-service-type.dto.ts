import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateServiceTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;
}
