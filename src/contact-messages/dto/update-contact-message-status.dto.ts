import { Equals } from 'class-validator';

export class UpdateContactMessageStatusDto {
  @Equals(true)
  isRead!: true;
}
