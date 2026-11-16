import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

// =========================================================
// UPDATE RESERVATION TRANSFER
// =========================================================

export class UpdateReservationTransferDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  serviceTypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originTransferPointId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  destinationTransferPointId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  luggage?: number;

  // =========================================================
  // OUTBOUND TRANSFER
  // =========================================================

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  serviceDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  serviceTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  pickupDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  pickupTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  flightNumber?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  airlineId?: number | null;

  // =========================================================
  // RETURN TRANSFER
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
  returnFlightNumber?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  returnAirlineId?: number | null;
}
