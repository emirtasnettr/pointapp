import { IsString, MaxLength } from 'class-validator';

export class PatchLegalPageDto {
  @IsString()
  @MaxLength(500_000)
  html!: string;
}
