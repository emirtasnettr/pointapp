import { IsObject } from 'class-validator';

export class PatchStaffSettingsDto {
  @IsObject()
  values!: Record<string, unknown>;
}
