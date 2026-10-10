import { IsBoolean } from 'class-validator';

export class ChangeRoleStatusDto {
  @IsBoolean()
  isActive: boolean;
}
