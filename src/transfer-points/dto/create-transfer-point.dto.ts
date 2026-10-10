import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TransferPointType } from '../../generated/prisma/index.js';

export class CreateTransferPointDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zoneId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeExternal?: string;

  @IsEnum(TransferPointType)
  type: TransferPointType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
