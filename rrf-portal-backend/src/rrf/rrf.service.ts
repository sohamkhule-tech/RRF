import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Rrf, RrfStatus } from './entities/rrf.entity';
import { RrfApprover, ApprovalStatus, ApprovalLevel } from './entities/rrf-approver.entity';
import { User } from '../users/user.entity';
import { CreateRrfDto } from './dto/create-rrf.dto';
import { UpdateRrfDto } from './dto/update-rrf.dto';
import { RrfQueryDto } from './dto/rrf-query.dto';

interface StatusCount {
  status: string;
  count: string;
}

@Injectable()
export class RrfService {
  constructor(
    @InjectRepository(Rrf)
    private rrfRepository: Repository<Rrf>,
    @InjectRepository(RrfApprover)
    private rrfApproverRepository: Repository<RrfApprover>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) { }

  // ============================================================
  // ID GENERATION — uses PostgreSQL sequences to avoid race
  // conditions that existed with MAX(id) + 1 pattern.
  // Sequences are created on first use if they don't exist.
  // ============================================================

  // ──────────────────────────────────────────────────────────────────────────
  // SEQUENCE HELPERS
  //
  // Problem: CREATE SEQUENCE IF NOT EXISTS always starts at 1, even when the
  // table already has rows with sub_id = 'SUB-001', 'SUB-002' etc.
  // Calling nextval(1) then tries to insert 'SUB-001' again → unique constraint
  // violation (UQ_1715e3cedc1cce8fb5c9e107c07 on rrfs.sub_id).
  //
  // Fix: After creating the sequence (if it didn't exist), SETVAL it to the
  // highest numeric suffix already present in the table so the next nextval()
  // call always produces a value higher than anything already stored.
  // ──────────────────────────────────────────────────────────────────────────

  async generateSubId(): Promise<string> {
    // 1. Create the sequence if it doesn't exist yet
    await this.dataSource.query(`
      CREATE SEQUENCE IF NOT EXISTS rrf_sub_id_seq START 1 INCREMENT 1;
    `);

    // 2. Find the highest numeric part already used in sub_id column
    //    e.g. 'SUB-007' → 7.  COALESCE guards against an empty table.
    const maxRow = await this.dataSource.query(`
      SELECT COALESCE(
        MAX(
          CAST(
            REGEXP_REPLACE(sub_id, '[^0-9]', '', 'g') AS INTEGER
          )
        ), 0
      ) AS max_val
      FROM rrfs
      WHERE sub_id IS NOT NULL AND sub_id ~ '^SUB-[0-9]+$'
    `);
    const maxVal: number = parseInt(maxRow[0].max_val, 10) || 0;

    // 3. Advance the sequence past the current maximum (is_called = true means
    //    the next nextval() call will return maxVal + 1, not maxVal).
    if (maxVal > 0) {
      await this.dataSource.query(
        `SELECT setval('rrf_sub_id_seq', $1, true)`,
        [maxVal],
      );
    }

    // 4. Get the next safe value
    const result = await this.dataSource.query(
      `SELECT nextval('rrf_sub_id_seq') AS val`,
    );
    const num = parseInt(result[0].val, 10);
    return `SUB-${num.toString().padStart(3, '0')}`;
  }

  async generateRrfNumber(): Promise<string> {
    // Same resync pattern as generateSubId, but for rrf_number / RRF-XXX
    await this.dataSource.query(`
      CREATE SEQUENCE IF NOT EXISTS rrf_number_seq START 1 INCREMENT 1;
    `);

    const maxRow = await this.dataSource.query(`
      SELECT COALESCE(
        MAX(
          CAST(
            REGEXP_REPLACE(rrf_number, '[^0-9]', '', 'g') AS INTEGER
          )
        ), 0
      ) AS max_val
      FROM rrfs
      WHERE rrf_number IS NOT NULL AND rrf_number ~ '^RRF-[0-9]+$'
    `);
    const maxVal: number = parseInt(maxRow[0].max_val, 10) || 0;

    if (maxVal > 0) {
      await this.dataSource.query(
        `SELECT setval('rrf_number_seq', $1, true)`,
        [maxVal],
      );
    }

    const result = await this.dataSource.query(
      `SELECT nextval('rrf_number_seq') AS val`,
    );
    const num = parseInt(result[0].val, 10);
    return `RRF-${num.toString().padStart(3, '0')}`;
  }

  // ============================================================
  // STATUS HISTORY — written on every status transition
  // ============================================================

  private buildStatusHistoryEntry(
    status: string,
    changedById: number,
    reason?: string,
  ) {
    return {
      status,
      changedById,
      changedAt: new Date().toISOString(),
      ...(reason ? { reason } : {}),
    };
  }

  private appendStatusHistory(rrf: Rrf, entry: object): void {
    const existing: object[] = Array.isArray(rrf.statusHistory)
      ? rrf.statusHistory
      : [];
    rrf.statusHistory = [...existing, entry];
  }

  // ============================================================
  // CRUD
  // ============================================================

  async create(createRrfDto: CreateRrfDto, userId: number): Promise<Rrf> {
    // SECURITY/DEBUG LOG: Verify incoming payload after ValidationPipe
    console.log('[DEBUG RRF Service] Incoming payload:', JSON.stringify(createRrfDto, null, 2));

    if (createRrfDto.budgetMin && createRrfDto.budgetMax) {
      if (createRrfDto.budgetMin > createRrfDto.budgetMax) {
        throw new BadRequestException(
          'Budget minimum cannot be greater than budget maximum',
        );
      }
    }

    if (createRrfDto.experienceMin && createRrfDto.experienceMax) {
      if (createRrfDto.experienceMin > createRrfDto.experienceMax) {
        throw new BadRequestException(
          'Experience minimum cannot be greater than experience maximum',
        );
      }
    }

    const subId = await this.generateSubId();

    const rrf = this.rrfRepository.create({
      ...createRrfDto,
      subId,
      rrfNumber: null,
      createdById: userId,
      status: RrfStatus.DRAFT,
      statusHistory: [
        this.buildStatusHistoryEntry(RrfStatus.DRAFT, userId),
      ],
    });

    return await this.rrfRepository.save(rrf);
  }

  async findAll(
    queryDto: RrfQueryDto,
  ): Promise<{ data: Rrf[]; total: number; page: number; limit: number }> {
    const { status, createdById, page = 1, limit = 10 } = queryDto;

    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .leftJoinAndSelect('rrf.createdBy', 'createdBy')
      .leftJoinAndSelect('rrf.approvers', 'approvers')
      .leftJoinAndSelect('approvers.user', 'approverUser')
      .orderBy('rrf.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      const statusList = status.split(',');
      qb.andWhere('rrf.status IN (:...statusList)', { statusList });
    }
    if (createdById) {
      qb.andWhere('rrf.createdById = :createdById', { createdById });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findByCreator(userId: number): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: { createdById: userId },
      relations: ['createdBy', 'approvers', 'approvers.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Rrf> {
    const rrf = await this.rrfRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'pmoVerifiedBy',
        'assignedToHr',
        'approvers',
        'approvers.user',
        'declinedBy',
      ],
    });

    if (!rrf) {
      throw new NotFoundException(`RRF with ID ${id} not found`);
    }

    return rrf;
  }

  async findByRrfNumber(rrfNumber: string): Promise<Rrf> {
    const rrf = await this.rrfRepository.findOne({
      where: { rrfNumber },
      relations: ['createdBy', 'pmoVerifiedBy', 'assignedToHr', 'approvers', 'approvers.user'],
    });

    if (!rrf) {
      throw new NotFoundException(`RRF ${rrfNumber} not found`);
    }

    return rrf;
  }

  async update(id: number, updateRrfDto: UpdateRrfDto, userId: number): Promise<Rrf> {
    const rrf = await this.findOne(id);

    const allowedEditStatuses = [
      RrfStatus.DRAFT,
      RrfStatus.PENDING,
      RrfStatus.SUBMITTED,
      RrfStatus.DECLINED,
      RrfStatus.REJECTED,
      RrfStatus.ON_HOLD,
    ];

    if (!allowedEditStatuses.includes(rrf.status as RrfStatus)) {
      throw new BadRequestException(`Cannot update RRF with status: ${rrf.status}. Editing is not allowed for approved or closed requests.`);
    }

    if (rrf.createdById !== Number(userId)) {
      throw new ForbiddenException('You can only update your own RRF requests');
    }

    if (
      updateRrfDto.budgetMin !== undefined &&
      updateRrfDto.budgetMax !== undefined
    ) {
      if (updateRrfDto.budgetMin > updateRrfDto.budgetMax) {
        throw new BadRequestException(
          'Budget minimum cannot be greater than budget maximum',
        );
      }
    }

    if (
      updateRrfDto.experienceMin !== undefined &&
      updateRrfDto.experienceMax !== undefined
    ) {
      if (updateRrfDto.experienceMin > updateRrfDto.experienceMax) {
        throw new BadRequestException(
          'Experience minimum cannot be greater than experience maximum',
        );
      }
    }

    Object.assign(rrf, updateRrfDto);
    return await this.rrfRepository.save(rrf);
  }

  // ============================================================
  // APPROVER RESOLUTION — QueryBuilder replaces raw SQL
  // ============================================================

  private async getApprovers(): Promise<User[]> {
    // Raw SQL is used here intentionally — no user input involved (no injection risk),
    // and the join across 4 tables through a many-to-many junction doesn't map cleanly
    // to TypeORM QueryBuilder when using raw table joins (column name aliasing).
    const result = await this.dataSource.query(`
      SELECT DISTINCT u.*
      FROM users u
        INNER JOIN roles r       ON u.role_id = r.id
        INNER JOIN role_permissions rp ON r.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        INNER JOIN modules m     ON p.module_id = m.id
      WHERE u.is_active   = true
        AND r.is_active   = true
        AND p.is_active   = true
        AND m.is_active   = true
        AND m.module_code = 'APPROVALS'
        AND p.permission_code = 'APPROVE'
      ORDER BY u.full_name ASC
    `);

    // Re-hydrate as User entity instances so callers get strongly-typed objects
    return result.map((row: any) => {
      const user = new User();
      user.id = row.id;
      user.userId = row.user_id;
      user.email = row.email;
      user.fullName = row.full_name;
      user.department = row.department;
      user.isActive = row.is_active;
      return user;
    });
  }

  // ============================================================
  // WORKFLOW ACTIONS
  // ============================================================

  async submit(id: number, userId: number): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (rrf.createdById !== userId) {
      throw new ForbiddenException('You can only submit your own RRFs');
    }

    if (rrf.status !== RrfStatus.DRAFT) {
      throw new BadRequestException(`Cannot submit RRF with status: ${rrf.status}`);
    }

    // Fetch user to check role
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    // PMO Workflow: Skip Approver, Route directly to HR, Generate RRF ID
    if (user?.role?.roleCode === 'PMO') {
      rrf.status = RrfStatus.IN_PROGRESS;
      rrf.submittedAt = new Date();
      rrf.sentToHrAt = new Date();

      if (!rrf.rrfNumber) {
        rrf.rrfNumber = await this.generateRrfNumber();
      }

      this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.IN_PROGRESS, userId, 'PMO Direct Submission'));
      return await this.rrfRepository.save(rrf);
    }

    // HM Workflow: Assign Approvers
    const approvers = await this.getApprovers();

    if (approvers.length === 0) {
      throw new BadRequestException(
        'No approvers available in the system. Please contact administrator.',
      );
    }

    rrf.status = RrfStatus.PENDING;
    rrf.submittedAt = new Date();
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.PENDING, userId));

    const savedRrf = await this.rrfRepository.save(rrf);

    const approverRecords = approvers.map((approver, index) =>
      this.rrfApproverRepository.create({
        rrfId: savedRrf.id,
        userId: approver.id,
        approvalLevel: ApprovalLevel.L1,
        approvalOrder: index + 1,
        approvalStatus: ApprovalStatus.PENDING,
        isMandatory: false,
      }),
    );

    await this.rrfApproverRepository.save(approverRecords);

    return await this.findOne(id);
  }

  async approve(id: number, userId: number, comments?: string): Promise<Rrf> {
    const rrf = await this.findOne(id);

    // ⚠️  Type-safe comparison: TypeORM loads userId from DB as number, but JWT
    // may deliver it as a string through passport-jwt deserialization.
    // Using Number() on both sides prevents '3 === "3"' returning false.
    const numericUserId = Number(userId);

    const approverRecord = rrf.approvers?.find(
      (a) => Number(a.userId) === numericUserId && a.approvalStatus === ApprovalStatus.PENDING,
    );

    if (!approverRecord) {
      throw new ForbiddenException('You are not authorized to approve this RRF');
    }

    approverRecord.approvalStatus = ApprovalStatus.APPROVED;
    approverRecord.approvedAt = new Date();
    approverRecord.comments = comments;
    await this.rrfApproverRepository.save(approverRecord);

    const otherPendingApprovers = rrf.approvers.filter(
      (a) => a.id !== approverRecord.id && a.approvalStatus === ApprovalStatus.PENDING,
    );

    for (const a of otherPendingApprovers) {
      a.approvalStatus = ApprovalStatus.SKIPPED;
    }

    if (otherPendingApprovers.length > 0) {
      await this.rrfApproverRepository.save(otherPendingApprovers);
    }

    rrf.status = RrfStatus.APPROVED;
    rrf.approvedAt = new Date();
    rrf.approvedById = numericUserId;

    if (!rrf.rrfNumber) {
      rrf.rrfNumber = await this.generateRrfNumber();
    }

    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.APPROVED, numericUserId, comments));

    return await this.rrfRepository.save(rrf);
  }

  async reject(id: number, userId: number, comments: string): Promise<Rrf> {
    const rrf = await this.findOne(id);
    const numericUserId = Number(userId);

    const approverRecord = rrf.approvers?.find(
      (a) => Number(a.userId) === numericUserId && a.approvalStatus === ApprovalStatus.PENDING,
    );

    if (!approverRecord) {
      throw new ForbiddenException('You are not authorized to reject this RRF');
    }

    approverRecord.approvalStatus = ApprovalStatus.REJECTED;
    approverRecord.rejectedAt = new Date();
    approverRecord.comments = comments;
    await this.rrfApproverRepository.save(approverRecord);

    rrf.status = RrfStatus.REJECTED;
    rrf.rejectedAt = new Date();
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.REJECTED, numericUserId, comments));

    return await this.rrfRepository.save(rrf);
  }

  async remove(id: number): Promise<void> {
    const rrf = await this.findOne(id);

    if (rrf.status !== RrfStatus.DRAFT && rrf.status !== RrfStatus.REJECTED) {
      throw new BadRequestException(`Cannot delete RRF with status: ${rrf.status}`);
    }

    await this.rrfRepository.delete(id);
  }

  async assignApproversToRrf(id: number): Promise<Rrf> {
    const rrf = await this.findOne(id);
    const approvers = await this.getApprovers();

    if (approvers.length === 0) {
      throw new BadRequestException('No approvers available in the system.');
    }

    const existingApproverIds = rrf.approvers?.map((a) => a.userId) || [];
    const newApprovers = approvers.filter(
      (approver) => !existingApproverIds.includes(approver.id),
    );

    if (newApprovers.length === 0) {
      return rrf;
    }

    const approverRecords = newApprovers.map((approver, index) =>
      this.rrfApproverRepository.create({
        rrfId: rrf.id,
        userId: approver.id,
        approvalLevel: ApprovalLevel.L1,
        approvalOrder: existingApproverIds.length + index + 1,
        approvalStatus: ApprovalStatus.PENDING,
        isMandatory: false,
      }),
    );

    await this.rrfApproverRepository.save(approverRecords);

    return await this.findOne(id);
  }

  // ============================================================
  // STATISTICS — single GROUP BY query instead of 8 COUNT queries
  // ============================================================

  async getStatistics(userId?: number): Promise<object> {
    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .select('rrf.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rrf.status');

    if (userId) {
      qb.where('rrf.createdById = :userId', { userId });
    }

    const rows: StatusCount[] = await qb.getRawMany();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const n = parseInt(row.count, 10);
      counts[row.status] = n;
      total += n;
    }

    const get = (...keys: string[]) =>
      keys.reduce((sum, k) => sum + (counts[k] || 0), 0);

    return {
      total,
      byStatus: {
        draft: get(RrfStatus.DRAFT),
        // Combine PENDING + SUBMITTED (alias) for backward-compat display
        pending: get(RrfStatus.PENDING, RrfStatus.SUBMITTED),
        submitted: get(RrfStatus.SUBMITTED),
        approved: get(RrfStatus.APPROVED),
        rejected: get(RrfStatus.REJECTED),
        declined: get(RrfStatus.DECLINED),
        onHold: get(RrfStatus.ON_HOLD),
        openForHiring: get(RrfStatus.IN_PROGRESS, RrfStatus.OPEN_FOR_HIRING),
        closedByBench: get(RrfStatus.CLOSED_BY_BENCH),
        closed: get(RrfStatus.CLOSED),
      },
    };
  }

  // ============================================================
  // WORKFLOW METHODS
  // ============================================================

  async decline(id: number, userId: number, reason: string): Promise<Rrf> {
    const rrf = await this.findOne(id);
    const numericUserId = Number(userId);

    const approverRecord = rrf.approvers?.find(
      (a) => Number(a.userId) === numericUserId && a.approvalStatus === ApprovalStatus.PENDING,
    );

    if (!approverRecord) {
      throw new ForbiddenException('You are not authorized to decline this RRF');
    }

    if (rrf.status !== RrfStatus.PENDING) {
      throw new BadRequestException(`Cannot decline RRF with status: ${rrf.status}`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Decline reason is required');
    }

    approverRecord.approvalStatus = ApprovalStatus.REJECTED;
    approverRecord.rejectedAt = new Date();
    approverRecord.comments = reason;
    await this.rrfApproverRepository.save(approverRecord);

    rrf.status = RrfStatus.DECLINED;
    rrf.declinedAt = new Date();
    rrf.declinedById = numericUserId;
    rrf.declineReason = reason;
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.DECLINED, numericUserId, reason));

    return await this.rrfRepository.save(rrf);
  }

  async putOnHold(id: number, userId: number, reason: string): Promise<Rrf> {
    const rrf = await this.findOne(id);
    const numericUserId = Number(userId);

    const approverRecord = rrf.approvers?.find(
      (a) => Number(a.userId) === numericUserId && a.approvalStatus === ApprovalStatus.PENDING,
    );

    if (!approverRecord) {
      throw new ForbiddenException('You are not authorized to put this RRF on hold');
    }

    if (rrf.status !== RrfStatus.PENDING) {
      throw new BadRequestException(`Cannot put on hold RRF with status: ${rrf.status}`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Hold reason is required');
    }

    rrf.status = RrfStatus.ON_HOLD;
    rrf.notes = reason;
    // Reuse declineReason/declinedAt/declinedById so the HM detail view
    // can display who put the RRF on hold and the reason (no schema migration needed).
    rrf.declineReason = reason;
    rrf.declinedAt = new Date();
    rrf.declinedById = numericUserId;
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.ON_HOLD, numericUserId, reason));

    return await this.rrfRepository.save(rrf);
  }

  async openForHiring(id: number, userId: number): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (rrf.status !== RrfStatus.APPROVED) {
      throw new BadRequestException(
        `Only approved requests can be sent to HR. Current status: ${rrf.status}`,
      );
    }

    rrf.status = RrfStatus.IN_PROGRESS;
    rrf.sentToHrAt = new Date();
    this.appendStatusHistory(rrf, {
      status: RrfStatus.IN_PROGRESS,
      action: 'SENT_TO_HR',
      changedById: userId,
      changedAt: new Date().toISOString()
    });

    return await this.rrfRepository.save(rrf);
  }

  async fillByBench(id: number, userId: number, notes?: string): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (rrf.status !== RrfStatus.APPROVED) {
      throw new BadRequestException(
        `Can only fill approved positions from bench. Current status: ${rrf.status}`,
      );
    }

    rrf.status = RrfStatus.CLOSED_BY_BENCH;
    rrf.closedAt = new Date();
    rrf.closedById = userId;
    rrf.notes = notes;
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.CLOSED_BY_BENCH, userId, notes));

    return await this.rrfRepository.save(rrf);
  }

  async closeRrf(id: number, userId: number, candidateName?: string, joiningDate?: string, closureStatus?: string, notes?: string): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (rrf.status !== RrfStatus.IN_PROGRESS && rrf.status !== RrfStatus.OPEN_FOR_HIRING) {
      throw new BadRequestException(
        `Can only close RRFs that are open for hiring. Current status: ${rrf.status}`,
      );
    }

    rrf.status = RrfStatus.CLOSED;
    rrf.closedAt = new Date();
    rrf.closedById = userId;
    rrf.candidateName = candidateName;
    rrf.joiningDate = joiningDate ? new Date(joiningDate) : null;
    rrf.closureStatus = closureStatus;
    rrf.notes = notes;
    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.CLOSED, userId, notes));

    return await this.rrfRepository.save(rrf);
  }

  async getMySubmissions(userId: number): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: { createdById: userId },
      relations: ['createdBy', 'approvedBy', 'approvers', 'approvers.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingApprovals(): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: { status: RrfStatus.PENDING },
      relations: ['createdBy', 'approvers', 'approvers.user'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getApprovedRrfs(): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: [
        { status: RrfStatus.APPROVED },
        { status: RrfStatus.DECLINED },
        { status: RrfStatus.ON_HOLD },
      ],
      relations: ['createdBy', 'approvedBy', 'approvers', 'approvers.user'],
      order: { approvedAt: 'DESC' },
    });
  }

  async getOpenPositions(): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: { status: RrfStatus.APPROVED },
      relations: ['createdBy', 'approvedBy'],
      order: { approvedAt: 'DESC' },
    });
  }

  async getOpenForHiring(): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: [
        { status: RrfStatus.IN_PROGRESS },
        { status: RrfStatus.OPEN_FOR_HIRING }
      ],
      relations: ['createdBy', 'approvedBy'],
      order: { sentToHrAt: 'DESC' },
    });
  }

  async getPMODashboardStats(): Promise<object> {
    const rows: StatusCount[] = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select('rrf.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('rrf.status IN (:...statuses)', {
        statuses: [
          RrfStatus.APPROVED,
          RrfStatus.IN_PROGRESS,
          RrfStatus.OPEN_FOR_HIRING,
          RrfStatus.CLOSED_BY_BENCH,
          RrfStatus.CLOSED,
        ],
      })
      .groupBy('rrf.status')
      .getRawMany();

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.status] = parseInt(r.count, 10);
    }

    const openedPositions = counts[RrfStatus.APPROVED] || 0;
    const sentToHR = (counts[RrfStatus.IN_PROGRESS] || 0) + (counts[RrfStatus.OPEN_FOR_HIRING] || 0);
    const closedByBench = counts[RrfStatus.CLOSED_BY_BENCH] || 0;
    const closed = counts[RrfStatus.CLOSED] || 0;
    const totalClosed = closedByBench + closed;

    return {
      openedPositions,
      sentToHR,
      totalProcessed: openedPositions + sentToHR + totalClosed,
      closed: totalClosed,
    };
  }
}
