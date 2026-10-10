import { IsBoolean } from 'class-validator';

export class ChangeTransferPointStatusDto {
  @IsBoolean()
  status: boolean;
}
