import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertRateGridItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originZoneId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationZoneId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  vehicleId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class UpsertRatesGridDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UpsertRateGridItemDto)
  items: UpsertRateGridItemDto[];
}
