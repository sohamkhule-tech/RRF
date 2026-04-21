import { IsString, IsArray, IsBoolean, IsInt, Min, Max, IsOptional, ArrayNotEmpty, ArrayUnique, MaxLength } from 'class-validator';

export class UpdateRrfFormConfigDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  step?: number;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  section?: string;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
