import { PartialType } from '@nestjs/mapped-types';
import { CreateSubfunctionDto } from './create-subfunction.dto';

export class UpdateSubfunctionDto extends PartialType(CreateSubfunctionDto) {}
