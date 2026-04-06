import { IsString, IsEnum, IsOptional, IsInt, Min, Max, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, EmploymentType, RrfStatus, RequisitionType } from '../entities/rrf.entity';

export class UpdateRrfDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  positionTitle?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  entity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  organisation?: string;

  @IsEnum(RequisitionType)
  @IsOptional()
  requisitionType?: RequisitionType;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nonBillableSubType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  function?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subFunction?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  projectName?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  headcount?: number;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(RrfStatus)
  @IsOptional()
  status?: RrfStatus;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  requiredSkills?: string;

  @IsString()
  @IsOptional()
  preferredSkills?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceMax?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  budgetMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  budgetMax?: number;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @IsString()
  @IsOptional()
  urgencyReason?: string;
}
