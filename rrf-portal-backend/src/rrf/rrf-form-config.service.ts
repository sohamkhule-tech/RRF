import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RrfFormConfig } from './entities/rrf-form-config.entity';
import { CreateRrfFormConfigDto } from './dto/create-rrf-form-config.dto';
import { UpdateRrfFormConfigDto } from './dto/update-rrf-form-config.dto';

@Injectable()
export class RrfFormConfigService {
  private readonly logger = new Logger(RrfFormConfigService.name);

  constructor(
    @InjectRepository(RrfFormConfig)
    private rrfFormConfigRepository: Repository<RrfFormConfig>,
  ) {}

  async findAll(): Promise<RrfFormConfig[]> {
    return this.rrfFormConfigRepository.find({
      where: { isActive: true },
      order: { step: 'ASC', displayOrder: 'ASC', fieldName: 'ASC' },
    });
  }

  async findByFieldName(fieldName: string): Promise<RrfFormConfig> {
    const config = await this.rrfFormConfigRepository.findOne({
      where: { fieldName, isActive: true },
    });

    if (!config) {
      throw new NotFoundException(`Form config for field '${fieldName}' not found`);
    }

    return config;
  }

  async create(createDto: CreateRrfFormConfigDto): Promise<RrfFormConfig> {
    const existing = await this.rrfFormConfigRepository.findOne({
      where: { fieldName: createDto.fieldName },
    });

    if (existing) {
      throw new ConflictException(`Form config for field '${createDto.fieldName}' already exists`);
    }

    // Validate no empty options
    if (createDto.options.some(opt => !opt || opt.trim() === '')) {
      throw new ConflictException('Options cannot contain empty values');
    }

    const config = this.rrfFormConfigRepository.create(createDto);
    return this.rrfFormConfigRepository.save(config);
  }

  async updateConfig(fieldName: string, updateDto: UpdateRrfFormConfigDto): Promise<RrfFormConfig> {
    let config = await this.rrfFormConfigRepository.findOne({
      where: { fieldName, isActive: true },
    });

    // Validate no empty options
    if (updateDto.options && updateDto.options.some(opt => !opt || opt.trim() === '')) {
      throw new ConflictException('Options cannot contain empty values');
    }

    if (!config) {
      // Auto-create (UPSERT) if it doesn't exist
      config = this.rrfFormConfigRepository.create({
        fieldName,
        label: updateDto.label || fieldName,
        options: updateDto.options || [],
        type: updateDto.type || 'dropdown',
        isRequired: updateDto.isRequired !== undefined ? updateDto.isRequired : false,
        isActive: updateDto.isActive !== undefined ? updateDto.isActive : true,
      });
    } else {
      // Update fields
      if (updateDto.label !== undefined) {
        config.label = updateDto.label;
      }
      if (updateDto.options !== undefined) {
        config.options = updateDto.options;
      }
      if (updateDto.type !== undefined) {
        config.type = updateDto.type;
      }
      if (updateDto.isRequired !== undefined) {
        config.isRequired = updateDto.isRequired;
      }
      if (updateDto.isActive !== undefined) {
        config.isActive = updateDto.isActive;
      }
    }

    return this.rrfFormConfigRepository.save(config);
  }
}
