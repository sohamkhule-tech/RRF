import { IsOptional, IsString, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
