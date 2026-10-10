import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateRateDto {
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
}
