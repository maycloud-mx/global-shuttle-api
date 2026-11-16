import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationTransferDto {
  // =========================================================
  // QUOTATION INFORMATION
  // =========================================================

  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateId: number;

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
  luggage: number;

  // =========================================================
  // OUTBOUND TRANSFER
  // =========================================================

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  serviceDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  serviceTime: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  pickupDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  pickupTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  flightNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  airlineId?: number;

  // =========================================================
  // RETURN TRANSFER
  // Required when service type is ROUND_TRIP
  // =========================================================

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnServiceDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  returnServiceTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnPickupDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  returnPickupTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  returnFlightNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  returnAirlineId?: number;
}
