import { IsBoolean } from 'class-validator';

export class ChangeVehicleStatusDto {
  @IsBoolean()
  status: boolean;
}
