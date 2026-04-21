import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubfunctionDto {
  @ApiProperty({ example: 'SGINTL', description: 'Name of the subfunction' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'ID of the parent function' })
  @IsNumber()
  @IsNotEmpty()
  functionId: number;

  @ApiProperty({ example: 'Delivery sub-department', description: 'Description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 0, description: 'Display order', required: false })
  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @ApiProperty({ example: true, description: 'Active status', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
