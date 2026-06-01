import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class PatchMarketingServiceDto {
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
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  heroTitleAccent?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(800)
  heroDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  contentHtml?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
