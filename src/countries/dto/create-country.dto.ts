import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/, {
    message: 'Country name cannot be empty',
  })
  name: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'ISO2 must contain exactly 2 letters',
  })
  iso2: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^\+[0-9]+(?:-[0-9]+)*$/, {
    message: 'Phone code must have a valid format, e.g. +52 or +1',
  })
  phoneCode: string;
}