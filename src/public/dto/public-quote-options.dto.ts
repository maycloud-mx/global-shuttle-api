import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PublicQuoteOptionsDto {
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

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  luggage: number;
}
