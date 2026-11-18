import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CompleteAccountActivationDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
