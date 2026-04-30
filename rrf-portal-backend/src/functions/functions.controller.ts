import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { FunctionsService } from './functions.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Controller('functions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  // Get all functions with their subfunctions
  @Get()
  @RequirePermission('RRF.READ')
  async findAll() {
    const functions = await this.functionsService.findAll();
    return {
      success: true,
      data: functions,
    };
  }

  // Get single function by ID
  @Get(':id')
  @RequirePermission('RRF.READ')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const functionEntity = await this.functionsService.findOne(id);
    return {
      success: true,
      data: functionEntity,
    };
  }

  // Get all subfunctions for a specific function (DEPENDENT DROPDOWN)
  @Get(':id/subfunctions')
  @RequirePermission('RRF.READ')
  async getSubfunctions(@Param('id', ParseIntPipe) id: number) {
    const subfunctions = await this.functionsService.getSubfunctionsByFunctionId(id);
    return {
      success: true,
      data: subfunctions,
    };
  }

  // Get unassigned subfunctions
  @Get('subfunctions/unassigned')
  @RequirePermission('RRF.READ')
  async getUnassignedSubfunctions() {
    const subfunctions = await this.functionsService.getUnassignedSubfunctions();
    return {
      success: true,
      data: subfunctions,
    };
  }

  // Create new function
  @Post()
  @RequirePermission('RRF.CREATE')
  async create(@Body() createFunctionDto: CreateFunctionDto) {
    const functionEntity = await this.functionsService.create(createFunctionDto);
    return {
      success: true,
      message: 'Function created successfully',
      data: functionEntity,
    };
  }

  // Update function
  @Put(':id')
  @RequirePermission('RRF.UPDATE')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFunctionDto: UpdateFunctionDto,
  ) {
    const functionEntity = await this.functionsService.update(id, updateFunctionDto);
    return {
      success: true,
      message: 'Function updated successfully',
      data: functionEntity,
    };
  }

  // Soft delete function
  @Delete(':id')
  @RequirePermission('FORM_CONFIG.DELETE')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.functionsService.remove(id);
    return {
      success: true,
      message: 'Function deleted successfully',
    };
  }

  // Hard delete function (admin only)
  @Delete(':id/hard')
  @RequirePermission('FORM_CONFIG.DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    await this.functionsService.hardDelete(id);
    return {
      success: true,
      message: 'Function permanently deleted',
    };
  }

  // Assign subfunctions to function
  @Post(':id/subfunctions')
  @RequirePermission('RRF.UPDATE')
  async assignSubfunctions(
    @Param('id', ParseIntPipe) id: number,
    @Body('subfunctionIds') subfunctionIds: number[],
  ) {
    await this.functionsService.assignSubfunctions(id, subfunctionIds);
    return {
      success: true,
      message: 'Subfunctions assigned successfully',
    };
  }
}
