import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ReservationTransferSegmentLeg,
  ReservationTransferSegmentType,
} from '../../generated/prisma/index.js';

export class ListReservationTransfersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  search?: string;

  @IsOptional()
  @IsEnum(ReservationTransferSegmentLeg)
  segmentLeg?: ReservationTransferSegmentLeg;

  @IsOptional()
  @IsEnum(ReservationTransferSegmentType)
  segmentType?: ReservationTransferSegmentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservationStatusId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  transferStatusId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentStatus?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  serviceDateFrom?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  serviceDateTo?: string;
}
