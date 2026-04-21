import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Function } from './function.entity';
import { Subfunction } from '../subfunctions/subfunction.entity';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Injectable()
export class FunctionsService {
  constructor(
    @InjectRepository(Function)
    private functionsRepository: Repository<Function>,
    @InjectRepository(Subfunction)
    private subfunctionsRepository: Repository<Subfunction>,
  ) {}

  // Get all functions with their active subfunctions
  async findAll(): Promise<Function[]> {
    return this.functionsRepository
      .createQueryBuilder('function')
      .leftJoinAndSelect(
        'function.subfunctions', 
        'subfunction', 
        'subfunction.isActive = :active', 
        { active: true }
      )
      .where('function.isActive = :active', { active: true })
      .orderBy('function.displayOrder', 'ASC')
      .addOrderBy('function.name', 'ASC')
      .addOrderBy('subfunction.displayOrder', 'ASC')
      .addOrderBy('subfunction.name', 'ASC')
      .getMany();
  }

  // Get single function  by ID with subfunctions
  async findOne(id: number): Promise<Function> {
    const functionEntity = await this.functionsRepository.findOne({
      where: { id },
      relations: ['subfunctions'],
    });

    if (!functionEntity) {
      throw new NotFoundException(`Function with ID ${id} not found`);
    }

    return functionEntity;
  }

  // Get all subfunctions for a specific function
  async getSubfunctionsByFunctionId(functionId: number): Promise<Subfunction[]> {
    await this.findOne(functionId); // Validate function exists

    return this.subfunctionsRepository.find({
      where: { 
        functionEntity: { id: functionId },
        isActive: true 
      },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  // Create new function with optional subfunction mapping
  async create(createFunctionDto: CreateFunctionDto): Promise<Function> {
    // Check for duplicate name
    const existing = await this.functionsRepository.findOne({
      where: { name: createFunctionDto.name },
    });

    if (existing) {
      throw new BadRequestException(`Function with name "${createFunctionDto.name}" already exists`);
    }

    // Create function
    const functionEntity = this.functionsRepository.create({
      name: createFunctionDto.name,
      description: createFunctionDto.description,
      isActive: createFunctionDto.isActive ?? true,
      displayOrder: createFunctionDto.displayOrder ?? 0,
    });

    const savedFunction = await this.functionsRepository.save(functionEntity);

    // Assign subfunctions if provided
    if (createFunctionDto.subfunctionIds && createFunctionDto.subfunctionIds.length > 0) {
      await this.assignSubfunctions(savedFunction.id, createFunctionDto.subfunctionIds);
    }

    // Return with relations
    return this.findOne(savedFunction.id);
  }

  // Update function
  async update(id: number, updateFunctionDto: UpdateFunctionDto): Promise<Function> {
    const functionEntity = await this.findOne(id);

    // Check for duplicate name (excluding current)
    if (updateFunctionDto.name && updateFunctionDto.name !== functionEntity.name) {
      const existing = await this.functionsRepository.findOne({
        where: { name: updateFunctionDto.name },
      });

      if (existing) {
        throw new BadRequestException(`Function with name "${updateFunctionDto.name}" already exists`);
      }
    }

    // Update function properties
    Object.assign(functionEntity, updateFunctionDto);
    await this.functionsRepository.save(functionEntity);

    // Update subfunction assignments if provided
    if (updateFunctionDto.subfunctionIds !== undefined) {
      await this.assignSubfunctions(id, updateFunctionDto.subfunctionIds);
    }

    return this.findOne(id);
  }

  // Soft delete function
  async remove(id: number): Promise<void> {
    const functionEntity = await this.findOne(id);

    // Check if function has active subfunctions
    const activeSubfunctionsCount = await this.subfunctionsRepository.count({
      where: { 
        functionEntity: { id },
        isActive: true
      },
    });

    if (activeSubfunctionsCount > 0) {
      throw new BadRequestException(
        `Cannot delete function "${functionEntity.name}" because it has ${activeSubfunctionsCount} active subfunctions. Please reassign or delete them first.`
      );
    }

    functionEntity.isActive = false;
    await this.functionsRepository.save(functionEntity);
  }

  // Hard delete function (admin only)
  async hardDelete(id: number): Promise<void> {
    const functionEntity = await this.findOne(id);

    // First, unlink all subfunctions
    await this.subfunctionsRepository.update(
      { functionEntity: { id } },
      { functionEntity: null }
    );

    // Then delete function
    await this.functionsRepository.remove(functionEntity);
  }

  // Assign subfunctions to a function
  async assignSubfunctions(functionId: number, subfunctionIds: number[]): Promise<void> {
    const functionEntity = await this.findOne(functionId);

    // First, unlink all current subfunctions from this function
    await this.subfunctionsRepository.update(
      { functionEntity: { id: functionId } },
      { functionEntity: null }
    );

    // Then, assign new subfunctions
    if (subfunctionIds.length > 0) {
      // Validate all subfunction IDs exist
      const subfunctions = await this.subfunctionsRepository.findByIds(subfunctionIds);

      if (subfunctions.length !== subfunctionIds.length) {
        throw new BadRequestException('One or more subfunction IDs are invalid');
      }

      // Update subfunctions to link to this function
      await this.subfunctionsRepository
        .createQueryBuilder()
        .update(Subfunction)
        .set({ functionEntity: functionEntity })
        .whereInIds(subfunctionIds)
        .execute();
    }
  }

  // Get unassigned subfunctions (not linked to any function)
  async getUnassignedSubfunctions(): Promise<Subfunction[]> {
    return this.subfunctionsRepository.find({
      where: { 
        functionEntity: null,
        isActive: true 
      },
      order: { name: 'ASC' },
    });
  }
}
