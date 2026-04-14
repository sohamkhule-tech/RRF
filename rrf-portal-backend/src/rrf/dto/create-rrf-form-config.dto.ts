import { IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional, IsInt, Min, Max, ArrayNotEmpty, ArrayUnique, MaxLength } from 'class-validator';

export class CreateRrfFormConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fieldName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  options: string[];

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
