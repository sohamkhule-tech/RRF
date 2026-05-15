import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { RrfApprover } from '../rrf/entities/rrf-approver.entity';
import { Rrf } from '../rrf/entities/rrf.entity';
import { UserSubfunction } from '../user-subfunctions/user-subfunction.entity';

@Injectable()
export class NotificationRecipientResolver {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RrfApprover)
    private rrfApproverRepository: Repository<RrfApprover>,
    @InjectRepository(Rrf)
    private rrfRepository: Repository<Rrf>,
    @InjectRepository(UserSubfunction)
    private userSubfunctionRepository: Repository<UserSubfunction>,
  ) {}

  async resolveByUserId(userId: number): Promise<number[]> {
    return [userId];
  }

  async resolveRrfCreator(rrfId: number): Promise<number[]> {
    const rrf = await this.rrfRepository.findOne({ where: { id: rrfId } });
    return rrf ? [rrf.createdById] : [];
  }

  async resolveRrfApprovers(rrfId: number): Promise<number[]> {
    const approvers = await this.rrfApproverRepository.find({
      where: { rrfId },
      select: ['userId'],
    });
    return approvers.map((a) => a.userId);
  }

  async resolveByRole(roleCode: string): Promise<number[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.role', 'role')
      .where('role.roleCode = :roleCode', { roleCode })
      .andWhere('user.isActive = true')
      .select(['user.id'])
      .getMany();
    return users.map((u) => u.id);
  }

  async resolveAllActive(): Promise<number[]> {
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id'],
    });
    return users.map((u) => u.id);
  }

  /**
   * Deduplicate and exclude the actor from the recipient list.
   */
  deduplicateAndExcludeActor(
    recipientIds: number[],
    actorId?: number,
  ): number[] {
    const unique = [...new Set(recipientIds)];
    if (actorId) {
      return unique.filter((id) => id !== actorId);
    }
    return unique;
  }
}
