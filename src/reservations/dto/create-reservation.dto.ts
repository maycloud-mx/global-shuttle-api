import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// =========================================================
// CUSTOMER
// =========================================================

export class CreateReservationCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
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

// =========================================================
// CREATE RESERVATION
// =========================================================

export class CreateReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId: number;

  @ValidateNested()
  @Type(() => CreateReservationCustomerDto)
  customer: CreateReservationCustomerDto;
}
