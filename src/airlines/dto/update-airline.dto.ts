import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAirlineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Matches(/\S/, {
    message: 'Airline name cannot be empty',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{2}$/, {
    message: 'IATA code must contain exactly 2 alphanumeric characters',
  })
  iataCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'ICAO code must contain exactly 3 letters',
  })
  icaoCode?: string;
}