import { IsBoolean } from 'class-validator';

export class ChangeCountryStatusDto {
  @IsBoolean()
  status: boolean;
}