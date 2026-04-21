import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OnHoldRrfDto {
  @ApiProperty({
    description: 'Reason for putting the RRF on hold',
    example: 'Awaiting budget approval from finance department',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason is required when putting an RRF on hold' })
  @MaxLength(1000)
  reason: string;
}
