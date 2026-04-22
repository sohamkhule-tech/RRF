import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JobDescriptionsService } from './job-descriptions.service';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/permissions.decorator';

@Controller('job-descriptions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class JobDescriptionsController {
  constructor(private readonly jobDescriptionsService: JobDescriptionsService) {}

  /**
   * GET /job-descriptions
   * Get all job descriptions (for dropdown)
   * Available to all authenticated users
   */
  @Get()
  async findAll(@Query('subFunction') subFunction?: string) {
    const jobDescriptions = await this.jobDescriptionsService.findAll(subFunction);
    
    // Return only necessary fields for dropdown
    return jobDescriptions.map(jd => ({
      id: jd.id,
      title: jd.title,
      description: jd.description,
      subFunction: jd.subFunction,
      createdBy: jd.createdBy ? {
        id: jd.createdBy.id,
        name: jd.createdBy.fullName,
      } : null,
      createdAt: jd.createdAt,
    }));
  }

  /**
   * GET /job-descriptions/:id
   * Get a single job description
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobDescriptionsService.findOne(id);
  }

  /**
   * POST /job-descriptions
   * Create a new job description
   * Requires RRF create permission
   */
  @Post()
  @RequirePermission('create_rrf')
  async create(@Body() createDto: CreateJobDescriptionDto, @Request() req) {
    return this.jobDescriptionsService.create(createDto, req.user.userId);
  }

  /**
   * PUT /job-descriptions/:id
   * Update a job description
   * Requires RRF update permission
   */
  @Put(':id')
  @RequirePermission('update_rrf')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateJobDescriptionDto,
  ) {
    return this.jobDescriptionsService.update(id, updateDto);
  }

  /**
   * DELETE /job-descriptions/:id
   * Delete a job description
   * Requires RRF delete permission
   */
  @Delete(':id')
  @RequirePermission('delete_rrf')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.jobDescriptionsService.remove(id);
    return { message: 'Job Description deleted successfully' };
  }
}
