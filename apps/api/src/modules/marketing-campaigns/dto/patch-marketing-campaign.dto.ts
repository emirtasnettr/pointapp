import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatchMarketingCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  contentHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  partnerLabel?: string | null;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
