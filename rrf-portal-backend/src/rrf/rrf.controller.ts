import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { RrfService } from './rrf.service';
import { RrfFormConfigService } from './rrf-form-config.service';
import { CreateRrfDto } from './dto/create-rrf.dto';
import { UpdateRrfDto } from './dto/update-rrf.dto';
import { RrfQueryDto } from './dto/rrf-query.dto';
import { CreateRrfFormConfigDto } from './dto/create-rrf-form-config.dto';
import { UpdateRrfFormConfigDto } from './dto/update-rrf-form-config.dto';

@Controller('rrf')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RrfController {
  private readonly logger = new Logger(RrfController.name);

  constructor(
    private readonly rrfService: RrfService,
    private readonly formConfigService: RrfFormConfigService,
  ) { }

  /**
   * Create new RRF
   * POST /rrf
   */
  @Post()
  @RequirePermission('RRF.CREATE')
  async create(
    @Body() createRrfDto: CreateRrfDto,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.create(createRrfDto, user.id);
    return {
      success: true,
      message: 'RRF created successfully',
      data: rrf,
    };
  }

  /**
   * Get all RRFs with filtering and pagination
   * GET /rrf
   */
  @Get()
  @RequirePermission('RRF.READ')
  async findAll(
    @Query() queryDto: RrfQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.rrfService.findAll(queryDto, user);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get current user's RRFs (Hiring Manager's requests)
   * GET /rrf/my-requests
   */
  @Get('my-requests')
  @RequirePermission('RRF.READ')
  async getMyRequests(@CurrentUser() user: AuthUser) {
    const rrfs = await this.rrfService.findByCreator(user.id);
    return {
      success: true,
      data: rrfs,
    };
  }

  /**
   * Get RRF statistics
   * GET /rrf/statistics
   */
  @Get('statistics')
  @RequirePermission('RRF.READ')
  async getStatistics(@CurrentUser() user: AuthUser, @Query('all') all?: string) {
    const result = await this.rrfService.getStatistics(user, all === 'true');
    return {
      success: true,
      data: result,
    };
  }

  // ========================================================================
  // WORKFLOW DASHBOARD GET ROUTES
  // NOTE: These MUST come before /rrf/:id to avoid route conflicts
  // ========================================================================

  /**
   * Get pending approvals (Approver dashboard)
   * GET /rrf/pending-approvals
   */
  @Get('pending-approvals')
  @RequirePermission('APPROVALS.APPROVE')
  async getPendingApprovals(@CurrentUser() user: AuthUser) {
    const rrfs = await this.rrfService.getPendingApprovals(user);
    return {
      success: true,
      data: rrfs,
    };
  }

  /**
   * Get open positions (PMO dashboard)
   * GET /rrf/pmo/open-positions
   */
  @Get('pmo/open-positions')
  @RequirePermission('RRF.READ')
  async getOpenPositions() {
    const rrfs = await this.rrfService.getOpenPositions();
    return {
      success: true,
      data: rrfs,
    };
  }

  /**
   * Get PMO dashboard statistics
   * GET /rrf/pmo/dashboard-stats
   */
  @Get('pmo/dashboard-stats')
  @RequirePermission('RRF.READ')
  async getPMODashboardStats() {
    const stats = await this.rrfService.getPMODashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get open for hiring (HR dashboard)
   * GET /rrf/hr/open-for-hiring
   */
  @Get('hr/open-for-hiring')
  @RequirePermission('RRF.READ')
  async getOpenForHiring() {
    const rrfs = await this.rrfService.getOpenForHiring();
    return {
      success: true,
      data: rrfs,
    };
  }

  // ========================================================================
  // END WORKFLOW DASHBOARD ROUTES
  // ========================================================================

  /**
   * Create new form configuration
   * POST /rrf/form-config
   */
  @Post('form-config')
  @RequirePermission('RRF.UPDATE') // Changed from DELETE to UPDATE
  async createFormConfig(@Body() createDto: CreateRrfFormConfigDto) {
    const config = await this.formConfigService.create(createDto);
    return {
      success: true,
      message: 'Form configuration created successfully',
      data: config,
    };
  }

  /**
   * Get all form configurations (for dynamic dropdowns)
   * GET /rrf/form-config
   */
  @Get('form-config')
  @RequirePermission('RRF.READ')
  async getFormConfigs() {
    const configs = await this.formConfigService.findAll();
    return {
      success: true,
      data: configs,
    };
  }

  @Put('form-config/:fieldName')
  @RequirePermission('RRF.UPDATE')
  async updateFormConfig(
    @Param('fieldName') fieldName: string,
    @Body() updateDto: UpdateRrfFormConfigDto,
  ) {
    const config = await this.formConfigService.updateConfig(fieldName, updateDto);
    return {
      success: true,
      message: 'Form configuration updated successfully',
      data: config,
    };
  }

  /**
   * Delete form configuration
   * DELETE /rrf/form-config/:fieldName
   */
  @Delete('form-config/:fieldName')
  @RequirePermission('RRF.DELETE')
  async removeFormConfig(@Param('fieldName') fieldName: string) {
    await this.formConfigService.remove(fieldName);
    return {
      success: true,
      message: 'Form configuration deleted successfully',
    };
  }

  /**
   * Get suggested interviewers based on technologies
   * GET /rrf/suggested-interviewers?technologies=Java,React
   */
  @Get('suggested-interviewers')
  @RequirePermission('RRF.READ')
  async getSuggestedInterviewers(@Query('technologies') technologies: string) {
    const techList = technologies ? technologies.split(',').map(t => t.trim()) : [];
    const interviewers = await this.rrfService.getSuggestedInterviewers(techList);
    return {
      success: true,
      data: interviewers,
    };
  }

  /**
   * Get single RRF by ID
   * GET /rrf/:id
   */
  @Get(':id')
  @RequirePermission('RRF.READ')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const rrf = await this.rrfService.findOne(id, true, user);
    return {
      success: true,
      data: rrf,
    };
  }

  /**
   * Update RRF (partial update)
   * PATCH /rrf/:id
   */
  @Patch(':id')
  @RequirePermission('RRF.UPDATE')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRrfDto: UpdateRrfDto,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.update(id, updateRrfDto, user.id);
    return {
      success: true,
      message: 'RRF updated successfully',
      data: rrf,
    };
  }

  /**
   * Submit RRF for approval
   * POST /rrf/:id/submit
   */
  @Post(':id/submit')
  @RequirePermission('RRF.UPDATE')
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    const rrf = await this.rrfService.submit(id, user.id);
    return {
      success: true,
      message: 'RRF submitted for approval',
      data: rrf,
    };
  }

  /**
   * Approve RRF
   * POST /rrf/:id/approve
   */
  @Post(':id/approve')
  @RequirePermission('APPROVALS.APPROVE')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('comments') comments: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.approve(id, user.id, comments);
    return {
      success: true,
      message: 'RRF approved successfully',
      data: rrf,
    };
  }

  /**
   * Reject RRF
   * POST /rrf/:id/reject
   */
  @Post(':id/reject')
  @RequirePermission('APPROVALS.REJECT')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('comments') comments: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.reject(id, user.id, comments);
    return {
      success: true,
      message: 'RRF rejected',
      data: rrf,
    };
  }

  /**
   * Assign approvers to RRF (utility endpoint for fixing existing RRFs)
   * POST /rrf/:id/assign-approvers
   */
  @Post(':id/assign-approvers')
  @RequirePermission('RRF.UPDATE')
  @HttpCode(HttpStatus.OK)
  async assignApprovers(@Param('id', ParseIntPipe) id: number) {
    const rrf = await this.rrfService.assignApproversToRrf(id);
    return {
      success: true,
      message: 'Approvers assigned successfully',
      data: rrf,
    };
  }

  /**
   * Delete RRF (PMO only)
   * DELETE /rrf/:id
   */
  @Delete(':id')
  @RequirePermission('RRF.DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rrfService.remove(id);
  }

  // ========================================================================
  // WORKFLOW ENDPOINTS
  // ========================================================================

  /**
   * Decline RRF (Approver action)
   * POST /rrf/:id/decline
   */
  @Post(':id/decline')
  @RequirePermission('APPROVALS.APPROVE')
  @HttpCode(HttpStatus.OK)
  async decline(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.decline(id, user.id, reason);
    return {
      success: true,
      message: 'RRF declined successfully',
      data: rrf,
    };
  }

  /**
   * Put RRF on hold (Approver action)
   * POST /rrf/:id/on-hold
   */
  @Post(':id/on-hold')
  @RequirePermission('APPROVALS.ON_HOLD')
  @HttpCode(HttpStatus.OK)
  async putOnHold(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.putOnHold(id, user.id, reason);
    return {
      success: true,
      message: 'RRF put on hold successfully',
      data: rrf,
    };
  }

  /**
   * Open RRF for hiring (PMO action)
   * POST /rrf/:id/open-for-hiring
   */
  @Post(':id/open-for-hiring')
  @RequirePermission('RRF.OPEN_FOR_HIRING')
  @HttpCode(HttpStatus.OK)
  async openForHiring(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.openForHiring(id, user.id);
    return {
      success: true,
      message: 'RRF opened for hiring successfully',
      data: rrf,
    };
  }

  /**
   * Fill position by bench (PMO action)
   * POST /rrf/:id/fill-by-bench
   */
  @Post(':id/fill-by-bench')
  @RequirePermission('RRF.FILL_FROM_BENCH')
  @HttpCode(HttpStatus.OK)
  async fillByBench(
    @Param('id', ParseIntPipe) id: number,
    @Body('candidateName') candidateName: string,
    @Body('joiningDate') joiningDate: string,
    @CurrentUser() user: AuthUser,
  ) {
    this.logger.log(`fillByBench called - RRF ID: ${id}, User: ${user.id}`);

    try {
      // ✅ Add timeout protection to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
      });

      const servicePromise = this.rrfService.fillByBench(id, user.id, candidateName, joiningDate);

      // Race between service call and timeout
      const rrf = await Promise.race([servicePromise, timeoutPromise]) as any;

      this.logger.log(`fillByBench completed - RRF ID: ${id}`);

      return {
        success: true,
        message: 'Position filled by bench and closed successfully',
        data: rrf,
      };
    } catch (error) {
      this.logger.error(`fillByBench error - RRF ID: ${id}: ${error.message}`);
      throw error;  // NestJS will handle the error response
    }
  }

  /**
   * Close RRF (HR action)
   * POST /rrf/:id/close
   */
  @Post(':id/close')
  @RequirePermission('RRF.CLOSE')
  @HttpCode(HttpStatus.OK)
  async closeRrf(
    @Param('id', ParseIntPipe) id: number,
    @Body('candidateName') candidateName: string,
    @Body('joiningDate') joiningDate: string,
    @Body('closureStatus') closureStatus: string,
    @Body('notes') notes: string,
    @CurrentUser() user: AuthUser,
  ) {
    const rrf = await this.rrfService.closeRrf(id, user.id, candidateName, joiningDate, closureStatus, notes);
    return {
      success: true,
      message: 'RRF closed successfully',
      data: rrf,
    };
  }

}
