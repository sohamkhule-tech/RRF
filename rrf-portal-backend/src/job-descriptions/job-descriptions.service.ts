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
   * Get job descriptions:
   * - If subFunction is provided: returns templates matching subFunction OR global templates (null)
   * - If no subFunction: returns all latest templates
   */
  async findAll(subFunction?: string): Promise<JobDescription[]> {
    const where = subFunction 
      ? [{ subFunction }, { subFunction: null }] // Match specific OR global
      : {}; // All if none specified

    return this.jobDescriptionRepository.find({
      where,
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
