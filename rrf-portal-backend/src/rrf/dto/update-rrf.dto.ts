import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RrfStatus } from '../entities/rrf.entity';
import { CreateRrfDto } from './create-rrf.dto';

export class UpdateRrfDto extends PartialType(CreateRrfDto) {
  @IsEnum(RrfStatus)
  @IsOptional()
  status?: RrfStatus;
}

