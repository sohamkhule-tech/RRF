import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'Full name', example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ description: 'Department', example: 'Engineering', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiProperty({ description: 'Phone number', example: '+91 9876543210', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ description: 'Role ID', example: 3, required: false })
  @IsNumber()
  @IsOptional()
  roleId?: number;

  @ApiProperty({ description: 'Active status', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Array of subfunction IDs (required if role is APPROVER)',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  subfunctionIds?: number[];

  @ApiProperty({
    description: 'Array of technology strings (names from master list)',
    example: ['Java', 'React'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  technologies?: string[];
}
