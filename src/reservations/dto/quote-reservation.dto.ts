import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReservationPricingDto } from './reservation-pricing.dto.js';

export class QuoteReservationCustomerDto {
  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(191)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId?: number;
}

export class QuoteReservationDto extends ReservationPricingDto {
  @Type(() => QuoteReservationCustomerDto)
  @ValidateNested()
  customer: QuoteReservationCustomerDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  luggage = 0;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  serviceDate: string;

  @IsMilitaryTime()
  serviceTime: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  pickupDate: string;

  @IsMilitaryTime()
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

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  returnServiceDate?: string;

  @IsOptional()
  @IsMilitaryTime()
  returnServiceTime?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  returnPickupDate?: string;

  @IsOptional()
  @IsMilitaryTime()
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
