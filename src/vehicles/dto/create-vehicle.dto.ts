import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPax: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPax: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  luggageCapacity: number;

  @IsOptional()
  @IsString()
  descriptionEs?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
