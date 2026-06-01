import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMarketingCampaignDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary!: string;

  @IsString()
  @MaxLength(500_000)
  contentHtml!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  partnerLabel?: string;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
