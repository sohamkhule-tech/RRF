import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclineRrfDto {
  @ApiProperty({
    description: 'Reason for declining the RRF',
    example: 'Position requirements are unclear, please revise and resubmit',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason is required when declining an RRF' })
  @MaxLength(1000)
  reason: string;
}
