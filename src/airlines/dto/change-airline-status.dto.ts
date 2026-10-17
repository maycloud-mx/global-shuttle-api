import { IsBoolean } from 'class-validator';

export class ChangeAirlineStatusDto {
  @IsBoolean()
  status: boolean;
}