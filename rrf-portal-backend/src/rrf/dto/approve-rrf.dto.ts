import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveRrfDto {
  @ApiProperty({
    description: 'Optional comments or notes for the approval',
    example: 'Approved as per business requirements',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comments?: string;
}
