import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignLogisticsTransferDto {
  // ============================================
  // OPERATOR
  // ============================================

  @IsOptional()
  @IsString()
  @MaxLength(150)
  operatorName?: string | null;

  // ============================================
  // UNIT
  // ============================================

  @IsOptional()
  @IsString()
  @MaxLength(150)
  unitName?: string | null;
}
