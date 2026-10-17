import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReservationPricingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  originTransferPointId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationTransferPointId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers: number;
}
