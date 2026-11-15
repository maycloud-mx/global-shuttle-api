import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

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
