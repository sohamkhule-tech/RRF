import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rrf } from '../rrf/entities/rrf.entity';

@Injectable()
export class MigrateSubIdService {
  constructor(
    @InjectRepository(Rrf)
    private rrfRepository: Repository<Rrf>,
  ) {}

  async migrateExistingRecords(): Promise<{ success: boolean; updated: number; message: string }> {
    try {
      // Get all RRFs without sub_id
      const rrfsWithoutSubId = await this.rrfRepository.find({
        where: { subId: null as any },
        order: { id: 'ASC' },
      });

      if (rrfsWithoutSubId.length === 0) {
        return {
          success: true,
          updated: 0,
          message: 'No records need migration. All RRFs already have SUB-IDs.',
        };
      }

      let updated = 0;
      for (const rrf of rrfsWithoutSubId) {
        // Generate SUB-ID based on record ID
        const subId = `SUB-${String(rrf.id).padStart(3, '0')}`;
        
        // Update the record
        await this.rrfRepository.update(rrf.id, { subId });
        updated++;
      }

      return {
        success: true,
        updated,
        message: `Successfully migrated ${updated} RRF records with SUB-IDs.`,
      };
    } catch (error) {
      return {
        success: false,
        updated: 0,
        message: `Migration failed: ${error.message}`,
      };
    }
  }
}

