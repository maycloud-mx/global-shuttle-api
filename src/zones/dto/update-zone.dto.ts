import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ZoneAirportTimeDto } from './zone-airport-time.dto.js';

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isLocal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeExternal?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique((item: ZoneAirportTimeDto) => item.transferPointId)
  @ValidateNested({ each: true })
  @Type(() => ZoneAirportTimeDto)
  airportTimes?: ZoneAirportTimeDto[];
}
