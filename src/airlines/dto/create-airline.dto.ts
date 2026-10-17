import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAirlineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Matches(/\S/, {
    message: 'Airline name cannot be empty',
  })
  name: string;

  @IsString()
  @Matches(/^[A-Za-z0-9]{2}$/, {
    message: 'IATA code must contain exactly 2 alphanumeric characters',
  })
  iataCode: string;

  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'ICAO code must contain exactly 3 letters',
  })
  icaoCode: string;
}