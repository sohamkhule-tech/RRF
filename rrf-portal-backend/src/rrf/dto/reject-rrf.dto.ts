import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRrfDto {
  @ApiProperty({
    description: 'Reason for rejecting the RRF',
    example: 'Does not align with current headcount budget',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Comments are required when rejecting an RRF' })
  @MaxLength(1000)
  comments: string;
}
