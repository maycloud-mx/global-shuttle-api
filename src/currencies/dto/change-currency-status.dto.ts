import { IsBoolean } from 'class-validator';

export class ChangeCurrencyStatusDto {
  @IsBoolean()
  status: boolean;
}
