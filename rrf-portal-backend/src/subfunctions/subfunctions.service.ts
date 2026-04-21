import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subfunction } from './subfunction.entity';
import { Function } from '../functions/function.entity';
import { CreateSubfunctionDto } from './dto/create-subfunction.dto';
import { UpdateSubfunctionDto } from './dto/update-subfunction.dto';

@Injectable()
export class SubfunctionsService {
  constructor(
    @InjectRepository(Subfunction)
    private subfunctionRepository: Repository<Subfunction>,
    @InjectRepository(Function)
    private functionRepository: Repository<Function>,
  ) {}

  async findAll(): Promise<Subfunction[]> {
    return this.subfunctionRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByFunction(functionName: string): Promise<Subfunction[]> {
    return this.subfunctionRepository.find({
      where: { function: functionName, isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Subfunction> {
    return this.subfunctionRepository.findOne({ where: { id } });
  }

  async findByIds(ids: number[]): Promise<Subfunction[]> {
    if (!ids || ids.length === 0) return [];
    return this.subfunctionRepository.findByIds(ids);
  }

  async create(createSubfunctionDto: CreateSubfunctionDto): Promise<Subfunction> {
    // 1. Find parent function
    const functionEntity = await this.functionRepository.findOne({
      where: { id: createSubfunctionDto.functionId }
    });
    if (!functionEntity) {
      throw new NotFoundException(`Function with ID ${createSubfunctionDto.functionId} not found`);
    }

    // 2. Check for duplicate name (case-insensitive approach if database supports it, or simple find)
    const existing = await this.subfunctionRepository.findOne({
      where: { name: createSubfunctionDto.name }
    });

    if (existing) {
      // If it exists, reactivate and reassign to the new function
      existing.isActive = true;
      existing.functionEntity = functionEntity;
      existing.function = functionEntity.name;
      Object.assign(existing, {
        description: createSubfunctionDto.description ?? existing.description,
        displayOrder: createSubfunctionDto.displayOrder ?? existing.displayOrder,
      });
      return this.subfunctionRepository.save(existing);
    }

    // 3. Create fresh subfunction
    const subfunction = this.subfunctionRepository.create({
      ...createSubfunctionDto,
      functionEntity: functionEntity,
      function: functionEntity.name, // Legacy support
    });

    return this.subfunctionRepository.save(subfunction);
  }

  async update(id: number, updateSubfunctionDto: UpdateSubfunctionDto): Promise<Subfunction> {
    const subfunction = await this.findById(id);
    if (!subfunction) {
      throw new NotFoundException(`Subfunction with ID ${id} not found`);
    }

    // Check for name duplicate
    if (updateSubfunctionDto.name && updateSubfunctionDto.name !== subfunction.name) {
      const existing = await this.subfunctionRepository.findOne({
        where: { name: updateSubfunctionDto.name }
      });
      if (existing) {
        throw new BadRequestException(`Subfunction "${updateSubfunctionDto.name}" already exists`);
      }
    }

    // Update parent function if ID provided
    if (updateSubfunctionDto.functionId) {
       const functionEntity = await this.functionRepository.findOne({
        where: { id: updateSubfunctionDto.functionId }
      });
      if (!functionEntity) {
        throw new NotFoundException(`Function with ID ${updateSubfunctionDto.functionId} not found`);
      }
      subfunction.functionEntity = functionEntity;
      subfunction.function = functionEntity.name;
    }

    Object.assign(subfunction, updateSubfunctionDto);
    return this.subfunctionRepository.save(subfunction);
  }

  async remove(id: number): Promise<void> {
    const subfunction = await this.findById(id);
    if (!subfunction) {
      throw new NotFoundException(`Subfunction with ID ${id} not found`);
    }

    subfunction.isActive = false;
    await this.subfunctionRepository.save(subfunction);
  }
}
