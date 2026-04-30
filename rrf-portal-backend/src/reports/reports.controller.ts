import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/kpis
   * Returns KPI aggregation cards data
   */
  @Get('kpis')
  @RequirePermission('RRF.READ')
  async getKpis() {
    const kpis = await this.reportsService.getKpis();
    return { success: true, data: kpis };
  }

  /**
   * GET /reports/dataset
   * Returns paginated dataset based on selected KPI / filters
   */
  @Get('dataset')
  @RequirePermission('RRF.READ')
  async getDataset(@Query() query: ReportsQueryDto) {
    const result = await this.reportsService.getDataset(query);
    return { success: true, ...result };
  }

  /**
   * GET /reports/export/current
   * Export current filtered view (no pagination)
   */
  @Get('export/current')
  @RequirePermission('RRF.READ')
  async exportCurrentView(@Query() query: ReportsQueryDto) {
    const data = await this.reportsService.getExportData(query);
    return { success: true, data };
  }

  /**
   * GET /reports/export/full
   * Export full report of all reportable RRFs
   */
  @Get('export/full')
  @RequirePermission('RRF.READ')
  async exportFullReport() {
    const data = await this.reportsService.getFullReportExport();
    return { success: true, data };
  }
}
