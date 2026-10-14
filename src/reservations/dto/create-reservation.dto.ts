import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { QuoteReservationDto } from './quote-reservation.dto.js';

export class CreateReservationDto extends QuoteReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateId: number;
}
