import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RrfStatus } from '../entities/rrf.entity';

export class RrfQueryDto {
  @IsEnum(RrfStatus)
  @IsOptional()
  status?: RrfStatus;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  createdById?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
