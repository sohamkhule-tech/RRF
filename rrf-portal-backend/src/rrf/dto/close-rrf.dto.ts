import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ClosureStatus {
  POSITION_FILLED = 'Position Filled',
  CANCELLED = 'Cancelled',
  ON_HOLD_INDEFINITELY = 'On Hold Indefinitely',
  FILLED_FROM_BENCH = 'Filled from Bench',
}

export class CloseRrfDto {
  @ApiProperty({
    description: 'Name of the candidate who filled the position',
    example: 'Jane Smith',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  candidateName: string;

  @ApiProperty({
    description: 'Joining date of the candidate (ISO 8601 format)',
    example: '2026-05-01',
    type: String,
  })
  @IsDateString()
  @IsNotEmpty()
  joiningDate: string;

  @ApiProperty({
    description: 'Status indicating why the RRF is being closed',
    enum: ClosureStatus,
    example: ClosureStatus.POSITION_FILLED,
  })
  @IsEnum(ClosureStatus, {
    message: 'Invalid closure status. Must be one of: Position Filled, Cancelled, On Hold Indefinitely, Filled from Bench',
  })
  @IsNotEmpty()
  closureStatus: ClosureStatus;

  @ApiProperty({
    description: 'Additional notes about the closure',
    example: 'Candidate accepted offer on 2026-04-20',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: 'Classification key for the closure reason',
    example: 'RESOURCE_HIRED_EXTERNAL',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  closeReason?: string;
}
