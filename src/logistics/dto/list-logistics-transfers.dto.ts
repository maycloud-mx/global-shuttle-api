import { Transform, Type } from 'class-transformer';

import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListLogisticsTransfersDto {
  // ============================================
  // PAGINATION
  // ============================================

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

  // ============================================
  // SEARCH
  // ============================================

  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  // ============================================
  // SINGLE DATE - BACKWARD COMPATIBILITY
  // ============================================

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must have the format YYYY-MM-DD',
  })
  date?: string;

  // ============================================
  // DATE FROM
  // ============================================

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date from must have the format YYYY-MM-DD',
  })
  dateFrom?: string;

  // ============================================
  // DATE TO
  // ============================================

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date to must have the format YYYY-MM-DD',
  })
  dateTo?: string;

  // ============================================
  // ASSIGNMENT FILTER
  // ============================================

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  assigned?: boolean;
}
