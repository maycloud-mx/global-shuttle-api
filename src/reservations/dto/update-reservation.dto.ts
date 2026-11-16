import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// =========================================================
// UPDATE RESERVATION CUSTOMER
// =========================================================

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId?: number | null;
}
