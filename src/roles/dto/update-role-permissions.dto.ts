import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class RolePermissionDto {
  @IsInt()
  @Min(1)
  menuId: number;

  @IsInt()
  @Min(1)
  actionId: number;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique(
    (permission: RolePermissionDto) =>
      `${permission.menuId}:${permission.actionId}`,
  )
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}
