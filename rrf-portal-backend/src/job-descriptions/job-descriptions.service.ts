import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JobDescription } from './job-description.entity';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';

@Injectable()
export class JobDescriptionsService {
  constructor(
    @InjectRepository(JobDescription)
    private jobDescriptionRepository: Repository<JobDescription>,
  ) {}

  /**
   * Get all job descriptions with fallback logic:
   * 1. Try specific subFunction
   * 2. If none, return global templates (subFunction is null)
   */
  async findAll(subFunction?: string): Promise<JobDescription[]> {
    if (subFunction) {
      const templates = await this.jobDescriptionRepository.find({
        where: { subFunction },
        relations: ['createdBy'],
        order: { createdAt: 'DESC' },
        take: 20,
      });

      if (templates.length > 0) {
        return templates;
      }
    }

    // Fallback: Show global templates (where subFunction is null)
    // or all if no global exist
    const globalTemplates = await this.jobDescriptionRepository.find({
      where: { subFunction: null },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (globalTemplates.length > 0) {
      return globalTemplates;
    }

    // Ultimate fallback: just return latest 20
    return this.jobDescriptionRepository.find({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Get a single job description by ID
   */
  async findOne(id: number): Promise<JobDescription> {
    const jobDescription = await this.jobDescriptionRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!jobDescription) {
      throw new NotFoundException(`Job Description with ID ${id} not found`);
    }

    return jobDescription;
  }

  /**
   * Create a new job description
   */
  async create(createDto: CreateJobDescriptionDto, userId: number): Promise<JobDescription> {
    const normalizedTitle = createDto.title.trim();
    
    // Check for duplicate title (Case-insensitive + SubFunction match)
    const existing = await this.jobDescriptionRepository.findOne({
      where: { 
        title: ILike(normalizedTitle),
        subFunction: createDto.subFunction || null 
      },
    });

    if (existing) {
      return existing; // Idempotent: return existing instead of error
    }

    const jobDescription = this.jobDescriptionRepository.create({
      ...createDto,
      title: normalizedTitle,
      createdById: userId,
    });

    return this.jobDescriptionRepository.save(jobDescription);
  }

  /**
   * Update a job description
   */
  async update(id: number, updateDto: UpdateJobDescriptionDto): Promise<JobDescription> {
    const jobDescription = await this.findOne(id);

    // Check for duplicate title if title is being updated
    if (updateDto.title && updateDto.title !== jobDescription.title) {
      const existing = await this.jobDescriptionRepository.findOne({
        where: { title: updateDto.title },
      });

      if (existing) {
        throw new BadRequestException(`Job Description with title "${updateDto.title}" already exists`);
      }
    }

    Object.assign(jobDescription, updateDto);
    return this.jobDescriptionRepository.save(jobDescription);
  }

  /**
   * Delete a job description
   */
  async remove(id: number): Promise<void> {
    const jobDescription = await this.findOne(id);
    await this.jobDescriptionRepository.remove(jobDescription);
  }
}
