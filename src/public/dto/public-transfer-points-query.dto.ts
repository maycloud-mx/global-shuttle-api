import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PublicTransferPointsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originTransferPointId?: number;
}
