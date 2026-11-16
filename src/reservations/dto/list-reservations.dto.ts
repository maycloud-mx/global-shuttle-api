import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListReservationsDto {
  // =========================================================
  // PAGINATION
  // =========================================================

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // =========================================================
  // GENERAL SEARCH
  // =========================================================

  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  // =========================================================
  // RESERVATION STATUS
  // =========================================================

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservationStatusId?: number;

  // =========================================================
  // CREATION DATE FILTERS
  // =========================================================

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  createdDateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  createdDateTo?: string;
}
