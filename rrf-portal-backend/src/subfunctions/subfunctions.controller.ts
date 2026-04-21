import { Controller, Get, Post, Put, Delete, UseGuards, Query, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { SubfunctionsService } from './subfunctions.service';
import { CreateSubfunctionDto } from './dto/create-subfunction.dto';
import { UpdateSubfunctionDto } from './dto/update-subfunction.dto';

@ApiTags('Subfunctions')
@ApiBearerAuth()
@Controller('subfunctions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubfunctionsController {
  constructor(private readonly subfunctionsService: SubfunctionsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all active subfunctions',
    description: 'Retrieves list of active subfunctions for approver assignment',
  })
  @ApiQuery({ 
    name: 'function', 
    required: false, 
    description: 'Filter by parent function (Delivery, Sales, Support)',
  })
  @ApiResponse({ status: 200, description: 'Returns list of subfunctions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('function') functionName?: string) {
    if (functionName) {
      return {
        success: true,
        data: await this.subfunctionsService.findByFunction(functionName),
      };
    }
    return {
      success: true,
      data: await this.subfunctionsService.findAll(),
    };
  }

  @Post()
  @RequirePermission('RRF.UPDATE')
  @ApiOperation({ summary: 'Create new subfunction' })
  async create(@Body() createSubfunctionDto: CreateSubfunctionDto) {
    const subfunction = await this.subfunctionsService.create(createSubfunctionDto);
    return {
      success: true,
      message: 'Subfunction created successfully',
      data: subfunction,
    };
  }

  @Put(':id')
  @RequirePermission('RRF.UPDATE')
  @ApiOperation({ summary: 'Update subfunction' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubfunctionDto: UpdateSubfunctionDto,
  ) {
    const subfunction = await this.subfunctionsService.update(id, updateSubfunctionDto);
    return {
      success: true,
      message: 'Subfunction updated successfully',
      data: subfunction,
    };
  }

  @Delete(':id')
  @RequirePermission('RRF.DELETE')
  @ApiOperation({ summary: 'Soft delete subfunction' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.subfunctionsService.remove(id);
    return {
      success: true,
      message: 'Subfunction deleted successfully',
    };
  }
}
