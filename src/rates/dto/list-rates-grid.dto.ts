
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class ListRatesGridDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationZoneId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  status?: boolean;
}
