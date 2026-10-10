import { IsBoolean } from 'class-validator';

export class ChangeZoneStatusDto {
  @IsBoolean()
  status: boolean;
}
