import { IsOptional, IsEnum, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportStatusFilter {
  ALL = 'all',
  IN_PROGRESS = 'in-progress',
  CLOSED = 'closed',
}

export enum ReportCloseReasonFilter {
  ALL = 'all',
  RESOURCE_HIRED_EXTERNAL = 'RESOURCE_HIRED_EXTERNAL',
  SOURCED_INTERNALLY = 'SOURCED_INTERNALLY',
  CLOSED_BY_BUSINESS = 'CLOSED_BY_BUSINESS',
}

export enum ReportKpiFilter {
  REVENUE_LOSS = 'revenue-loss',
  AVG_DELAY = 'avg-delay',
  SOURCED_INTERNALLY = 'sourced-internally',
  OPPORTUNITY_LOST = 'opportunity-lost',
  AVG_CLOSING_TIME = 'avg-closing-time',
}

export class ReportsQueryDto {
  @IsOptional()
  @IsEnum(ReportStatusFilter)
  status?: ReportStatusFilter = ReportStatusFilter.ALL;

  @IsOptional()
  @IsEnum(ReportCloseReasonFilter)
  closeReason?: ReportCloseReasonFilter = ReportCloseReasonFilter.ALL;

  @IsOptional()
  @IsEnum(ReportKpiFilter)
  kpi?: ReportKpiFilter;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'rrfNumber';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
