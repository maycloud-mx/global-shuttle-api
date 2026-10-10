import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class ZoneAirportTimeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  transferPointId: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(999.99)
  hours: number;
}
