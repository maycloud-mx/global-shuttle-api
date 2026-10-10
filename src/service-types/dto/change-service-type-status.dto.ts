import { IsBoolean } from 'class-validator';

export class ChangeServiceTypeStatusDto {
  @IsBoolean()
  status: boolean;
}
