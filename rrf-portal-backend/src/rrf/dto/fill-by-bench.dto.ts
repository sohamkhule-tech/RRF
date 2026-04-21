import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FillByBenchDto {
  @ApiProperty({
    description: 'Notes about the bench resource assigned to this position',
    example: 'Assigned John Doe from internal bench pool',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
