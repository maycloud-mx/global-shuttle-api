import { IsBoolean } from 'class-validator';

export class ChangeRateStatusDto {
  @IsBoolean()
  status: boolean;
}
