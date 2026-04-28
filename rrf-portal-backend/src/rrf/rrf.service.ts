import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not, In } from 'typeorm';
import { Rrf, RrfStatus } from './entities/rrf.entity';
import { RrfApprover, ApprovalStatus, ApprovalLevel } from './entities/rrf-approver.entity';
import { User } from '../users/user.entity';
import { UserSubfunction } from '../user-subfunctions/user-subfunction.entity';
import { Subfunction } from '../subfunctions/subfunction.entity';
import { CreateRrfDto } from './dto/create-rrf.dto';
import { UpdateRrfDto } from './dto/update-rrf.dto';
import { RrfQueryDto } from './dto/rrf-query.dto';
import { JobDescriptionsService } from '../job-descriptions/job-descriptions.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';

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
    @InjectRepository(UserSubfunction)
    private userSubfunctionRepository: Repository<UserSubfunction>,
    @InjectRepository(Subfunction)
    private subfunctionRepository: Repository<Subfunction>,
    @InjectDataSource()
    private dataSource: DataSource,
    private jobDescriptionsService: JobDescriptionsService,
  ) { }

  /**
   * Auto-Migration: Runs on startup to ensure backward compatibility
   * Maps existing sub_function (string) to subfunction_id (relation)
   */
  async onModuleInit() {
    // ── Sequence bootstrap (runs ONCE at startup) ──────────────────────────────
    // Creates the sequences if they don't exist and syncs them to the highest
    // value already stored in the table (covers legacy SUB- and current REQ-
    // prefixes for sub_id, and RRF- for rrf_number).
    // setval() is intentionally used here — this is a one-time migration step,
    // NOT part of runtime ID generation.
    try {
      await this.dataSource.query(`
        DO $$
        DECLARE
          max_sub  INTEGER;
          max_rrf  INTEGER;
        BEGIN
          -- TODO 7: Create sequences if absent
          CREATE SEQUENCE IF NOT EXISTS rrfs_sub_id_seq     START 1;
          CREATE SEQUENCE IF NOT EXISTS rrfs_rrf_number_seq START 1;

          -- Sync rrfs_sub_id_seq to the highest REQ-/SUB- number already stored
          SELECT COALESCE(
            MAX(CAST(REGEXP_REPLACE(sub_id, '[^0-9]', '', 'g') AS INTEGER)), 0
          ) INTO max_sub
          FROM rrfs
          WHERE sub_id IS NOT NULL AND sub_id ~ '^(SUB|REQ)-[0-9]+$';

          IF max_sub > 0 AND max_sub >= nextval('rrfs_sub_id_seq') - 1 THEN
            PERFORM setval('rrfs_sub_id_seq', max_sub);
          END IF;

          -- Sync rrfs_rrf_number_seq to the highest RRF- number already stored
          SELECT COALESCE(
            MAX(CAST(REGEXP_REPLACE(rrf_number, '[^0-9]', '', 'g') AS INTEGER)), 0
          ) INTO max_rrf
          FROM rrfs
          WHERE rrf_number IS NOT NULL AND rrf_number ~ '^RRF-[0-9]+$';

          IF max_rrf > 0 AND max_rrf >= nextval('rrfs_rrf_number_seq') - 1 THEN
            PERFORM setval('rrfs_rrf_number_seq', max_rrf);
          END IF;
        END $$;
      `);
      console.log('[RrfService] Sequences rrfs_sub_id_seq and rrfs_rrf_number_seq are ready.');
    } catch (err) {
      console.warn('[RrfService] Sequence bootstrap warning:', err.message);
    }

    // ── Subfunction link migration ─────────────────────────────────────────────
    console.log('[RrfService] Initializing: Checking for missing subFunctionId links...');
    try {
      const pendingMigrate = await this.rrfRepository.find({
        where: { subFunctionId: null },
        take: 100, // Process in batches to avoid blocking startup
      });

      if (pendingMigrate.length > 0) {
        const subfunctions = await this.subfunctionRepository.find();
        for (const rrf of pendingMigrate) {
          if (rrf.subFunction) {
            const match = subfunctions.find(
              (sf) => sf.name.trim().toLowerCase() === rrf.subFunction.trim().toLowerCase(),
            );
            if (match) {
              await this.rrfRepository.update(rrf.id, { subFunctionId: match.id });
            }
          }
        }
        console.log(`[RrfService] Successfully migrated ${pendingMigrate.length} RRF subfunction links.`);
      }
    } catch (error) {
      console.warn('[RrfService] Migration failed:', error.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ID GENERATION — pure nextval() only; no MAX(), no runtime setval().
  // Sequences are created and synced once in onModuleInit (above).
  // nextval() is atomic and concurrency-safe at the PostgreSQL level.
  // ──────────────────────────────────────────────────────────────────────────

  // TODO 1-3: generateSubId — uses rrfs_sub_id_seq exclusively
  async generateSubId(): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('rrfs_sub_id_seq') AS val;`);
    const num = parseInt(result[0].val, 10);
    return `REQ-${num.toString().padStart(3, '0')}`;
  }

  // TODO 4-6: generateRrfNumber — uses rrfs_rrf_number_seq exclusively
  async generateRrfNumber(): Promise<string> {
    const result = await this.dataSource.query(`SELECT nextval('rrfs_rrf_number_seq') AS val;`);
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

    const savedRrf = await this.rrfRepository.save(rrf);

    // ✅ Option A: Save as Template Logic
    if (createRrfDto.saveAsTemplate) {
      if (!createRrfDto.jobDescription || !createRrfDto.jobDescription.trim()) {
        throw new BadRequestException('Job Description is required when saving as a template');
      }

      await this.jobDescriptionsService.create({
        title: createRrfDto.positionTitle,
        description: createRrfDto.jobDescription,
        subFunction: createRrfDto.subFunction,
      }, userId);
    }

    return savedRrf;
  }

  async findAll(
    queryDto: RrfQueryDto,
    user?: AuthUser,
  ): Promise<{ data: Rrf[]; total: number; page: number; limit: number }> {
    const { status, createdById, page = 1, limit = 10 } = queryDto;

    // ✅ PERFORMANCE FIX: Remove approvers join from listing
    // Only join createdBy (essential for display)
    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .leftJoinAndSelect('rrf.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.role', 'role')  // Added role for display
      .select([
        'rrf',
        'createdBy.id',
        'createdBy.fullName',
        'createdBy.email',
        'createdBy.department',
        'role.id',
        'role.roleName',
        'role.roleCode',
      ])
      .orderBy('rrf.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // ── Subfunction-based visibility for Approvers ──────────────
    // Approvers see only RRFs belonging to their assigned subfunctions.
    if (user && user.role.roleCode === 'APPROVER') {
      const userSubfunctions = await this.userSubfunctionRepository.find({
        where: { userId: user.id },
      });
      const subIds = userSubfunctions.map((s) => s.subfunctionId);
      if (subIds.length === 0) {
        // No assigned subfunctions → no data access
        return { data: [], total: 0, page, limit };
      }
      qb.andWhere('rrf.subFunctionId IN (:...approverSubIds)', { approverSubIds: subIds });
    }
    // ────────────────────────────────────────────────────────────

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
    // ✅ PERFORMANCE FIX: Only load createdBy (self-reference) and role
    // Approvers are not needed for "My Requests" listing
    return await this.rrfRepository.find({
      where: { createdById: userId },
      relations: ['createdBy', 'createdBy.role'],
      select: {
        createdBy: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, includeRelations: boolean = true, user?: AuthUser): Promise<Rrf> {
    // ✅ PERFORMANCE FIX: Only load relations when absolutely needed
    // For RRF listing pages: includeRelations = false
    // For RRF detail pages: includeRelations = true
    
    const query: any = { where: { id } };
    
    if (includeRelations) {
      // Load only essential relations with select to reduce data transfer
      query.relations = ['createdBy', 'createdBy.role'];
      query.select = {
        createdBy: {
          id: true,
          fullName: true,
          email: true,
          department: true,
          role: {
            id: true,
            roleName: true,
            roleCode: true,
          },
        },
      };
    }
    
    const rrf = await this.rrfRepository.findOne(query);

    if (!rrf) {
      throw new NotFoundException(`RRF with ID ${id} not found`);
    }

    // ── Subfunction-based access control for Approvers ──────────────────
    // Approvers may only view RRFs belonging to their assigned subfunctions.
    if (user && user.role.roleCode === 'APPROVER') {
      const userSubfunctions = await this.userSubfunctionRepository.find({
        where: { userId: user.id },
      });
      const subIds = userSubfunctions.map((s) => s.subfunctionId);
      // Deny access when either the Approver has no assignment or the RRF's
      // subfunction is outside their scope.
      if (subIds.length === 0 || (rrf.subFunctionId && !subIds.includes(rrf.subFunctionId))) {
        throw new ForbiddenException('You do not have access to this RRF');
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ✅ Lazy load approvers only if needed (on-demand loading)
    if (includeRelations && rrf.status !== RrfStatus.DRAFT) {
      rrf.approvers = await this.rrfApproverRepository.find({
        where: { rrfId: id },
        relations: ['user', 'user.role'],
        select: {
          user: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        order: { approvalLevel: 'ASC' },
      });
    }

    // ✅ Load interview panel members if present
    if (includeRelations && rrf.interviewPanel && Array.isArray(rrf.interviewPanel) && rrf.interviewPanel.length > 0) {
      const panelUserIds = rrf.interviewPanel as number[];
      // @ts-ignore
      rrf.interviewers = await this.userRepository.find({
        where: { id: In(panelUserIds) },
        relations: ['role'],
        select: {
          id: true,
          fullName: true,
          email: true,
          role: {
            id: true,
            roleName: true,
          },
        },
      });
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
    const numericUserId = Number(userId);

    // ─── Role-based edit permission matrix ──────────────────────────────────
    // Determine if caller is the original creator (Hiring Manager)
    const isCreator = rrf.createdById === numericUserId;

    // Determine if caller is a registered approver for this RRF
    const approverRecord = rrf.approvers?.find(
      (a) => Number(a.userId) === numericUserId,
    );
    const isApprover = !!approverRecord;

    if (!isCreator && !isApprover) {
      throw new ForbiddenException('You are not authorized to edit this RRF');
    }

    // Statuses where each role is allowed to edit
    const hmAllowedStatuses: RrfStatus[] = [
      RrfStatus.DRAFT,
      RrfStatus.PENDING,
      RrfStatus.SUBMITTED,
      RrfStatus.DECLINED,
      RrfStatus.REJECTED,
      RrfStatus.ON_HOLD,
    ];

    const approverAllowedStatuses: RrfStatus[] = [
      RrfStatus.PENDING,
      RrfStatus.SUBMITTED,
      RrfStatus.DECLINED,
      RrfStatus.REJECTED,
    ];

    const allowedStatuses = isCreator ? hmAllowedStatuses : approverAllowedStatuses;

    if (!allowedStatuses.includes(rrf.status as RrfStatus)) {
      throw new BadRequestException(
        `Cannot update RRF with status: ${rrf.status}. ` +
        (isCreator
          ? 'Editing is only allowed for PENDING, DECLINED, and ON_HOLD requests.'
          : 'Approvers can only edit PENDING or DECLINED requests.'),
      );
    }
    // ────────────────────────────────────────────────────────────────────────

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

    // ─── Collaboration tracking fields ──────────────────────────────────────
    rrf.lastEditedById = numericUserId;
    rrf.lastEditedByRole = isCreator ? 'HIRING_MANAGER' : 'APPROVER';
    rrf.lastEditedAt = new Date();
    // ────────────────────────────────────────────────────────────────────────

    Object.assign(rrf, updateRrfDto);
    return await this.rrfRepository.save(rrf);
  }

  // ============================================================
  // APPROVER RESOLUTION — QueryBuilder replaces raw SQL
  // ============================================================

  /**
   * Get eligible approvers for a given subfunction.
   * Logic:
   * 1. Find active users whose role.roleCode = 'APPROVER' AND assigned to subFunctionId.
   * 2. Only if zero found → fallback to Admin users.
   *
   * NO permission-table lookup — direct role + subfunction join.
   */
  async getApprovers(subFunctionId?: number): Promise<User[]> {
    if (subFunctionId) {
      // Direct query: APPROVER role users assigned to this subfunction
      const assignedApprovers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.role', 'role')
        .innerJoin(
          'user_subfunctions',
          'us',
          'us.user_id = user.id AND us.subfunction_id = :subFunctionId',
          { subFunctionId },
        )
        .where('role.roleCode = :roleCode', { roleCode: 'APPROVER' })
        .andWhere('user.isActive = true')
        .orderBy('user.fullName', 'ASC')
        .getMany();

      if (assignedApprovers.length > 0) {
        return assignedApprovers;
      }

      console.warn(`[WARNING] No APPROVER assigned to subFunctionId ${subFunctionId}. Falling back to Admins.`);
      return this.getAdminFallbacks();
    }

    // No subFunctionId — return all active APPROVERs
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .where('role.roleCode = :roleCode', { roleCode: 'APPROVER' })
      .andWhere('user.isActive = true')
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }

  /**
   * Internal helper for fallback to Admin role
   */
  private async getAdminFallbacks(): Promise<User[]> {
    return this.userRepository.createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role')
      .where('role.roleCode = :adminRole', { adminRole: 'ADMIN' })
      .andWhere('user.isActive = true')
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }

  // ============================================================
  // WORKFLOW ACTIONS
  // ============================================================

  async submit(id: number, userId: number): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (rrf.createdById !== userId) {
      throw new ForbiddenException('You can only submit your own RRFs');
    }

    // Allow first submission (DRAFT) and resubmission after being declined/rejected
    const submittableStatuses = [
      RrfStatus.DRAFT,
      RrfStatus.DECLINED,
      RrfStatus.REJECTED,
    ];

    if (!submittableStatuses.includes(rrf.status as RrfStatus)) {
      throw new BadRequestException(`Cannot submit RRF with status: ${rrf.status}`);
    }

    const isResubmission = rrf.status === RrfStatus.DECLINED || rrf.status === RrfStatus.REJECTED;

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

    // ─── Resubmission: reset approver records so approval chain restarts ────
    if (isResubmission) {
      const existingApprovers = await this.rrfApproverRepository.find({
        where: { rrfId: id },
      });

      if (existingApprovers.length > 0) {
        for (const approver of existingApprovers) {
          approver.approvalStatus = ApprovalStatus.PENDING;
          approver.approvedAt = null;
          approver.rejectedAt = null;
          approver.comments = null;
        }
        await this.rrfApproverRepository.save(existingApprovers);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // HM Workflow: Assign Approvers (only on first submission; resubmission reuses existing records)
    if (!isResubmission) {
      const approvers = await this.getApprovers(rrf.subFunctionId);

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

    // Resubmission path: transition DECLINED → PENDING
    rrf.status = RrfStatus.PENDING;
    rrf.submittedAt = new Date();
    rrf.declineReason = null;
    this.appendStatusHistory(
      rrf,
      this.buildStatusHistoryEntry(RrfStatus.PENDING, userId, 'Resubmitted after decline'),
    );

    await this.rrfRepository.save(rrf);
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

    const approverUser = await this.userRepository.findOne({ where: { id: numericUserId } });
    rrf.approvedByName = approverUser?.fullName ?? null;

    // TODO 3: RRF number is no longer generated at approval time.
    // It is generated when PMO clicks "Open for Requisition" (openForHiring).
    // Leaving rrfNumber unchanged here preserves the REQ-xxx display until PMO acts.

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
    const approvers = await this.getApprovers(rrf.subFunctionId);

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

  // ✅ PRODUCTION-READY: Filter stats by Role and Subfunction (strict RBAC)
  async getStatistics(user: AuthUser, viewAll: boolean = false): Promise<object> {
    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .select('rrf.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rrf.status');

    // ─── Filter Logic ──────────────────────────────────────────
    // 1. APPROVER: Sees only their assigned subfunctions (always)
    // 2. HIRING_MANAGER: Sees only their own submissions (always)
    // 3. ADMIN: Sees all if viewAll is true, else only their own
    // ──────────────────────────────────────────────────────────

    if (user.role.roleCode === 'APPROVER') {
      const userSubfunctions = await this.userSubfunctionRepository.find({
        where: { userId: user.id },
      });
      const subIds = userSubfunctions.map((s) => s.subfunctionId);
      if (subIds.length > 0) {
        qb.where('rrf.subFunctionId IN (:...subIds)', { subIds });
      } else {
        qb.where('1=0'); // Security: If no subfunctions assigned, show zero
      }
    } else if (!viewAll || user.role.roleCode === 'HIRING_MANAGER') {
      qb.where('rrf.createdById = :userId', { userId: user.id });
    }

    const rows: StatusCount[] = await qb.getRawMany();

    const counts: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const n = parseInt(row.count, 10);
      counts[row.status] = n;
      total += n;
    }

    const getCount = (...keys: string[]) =>
      keys.reduce((sum, k) => sum + (counts[k] || 0), 0);

    return {
      total,
      byStatus: {
        draft: getCount(RrfStatus.DRAFT),
        pending: getCount(RrfStatus.PENDING, RrfStatus.SUBMITTED),
        submitted: getCount(RrfStatus.SUBMITTED),
        approved: getCount(RrfStatus.APPROVED),
        rejected: getCount(RrfStatus.REJECTED),
        declined: getCount(RrfStatus.DECLINED),
        onHold: getCount(RrfStatus.ON_HOLD),
        openForHiring: getCount(RrfStatus.IN_PROGRESS, RrfStatus.OPEN_FOR_HIRING),
        closedByBench: getCount(RrfStatus.CLOSED_BY_BENCH),
        closed: getCount(RrfStatus.CLOSED),
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

    const decliningUser = await this.userRepository.findOne({ where: { id: numericUserId } });
    rrf.declinedByName = decliningUser?.fullName ?? null;

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

    rrf.onHoldById = numericUserId;
    const holdingUser = await this.userRepository.findOne({ where: { id: numericUserId } });
    rrf.onHoldByName = holdingUser?.fullName ?? null;

    this.appendStatusHistory(rrf, this.buildStatusHistoryEntry(RrfStatus.ON_HOLD, numericUserId, reason));

    return await this.rrfRepository.save(rrf);
  }

  async openForHiring(id: number, userId: number): Promise<Rrf> {
    console.log(`[openForHiring] START - RRF ID: ${id}, User ID: ${userId}`);
    
    // ✅ PERFORMANCE FIX: Don't load relations for simple update
    const rrf = await this.findOne(id, false);  // includeRelations = false

    if (rrf.status !== RrfStatus.APPROVED) {
      console.error(`[openForHiring] Invalid status: ${rrf.status} for RRF ID: ${id}`);
      throw new BadRequestException(
        `Only approved requests can be sent to HR. Current status: ${rrf.status}`,
      );
    }

    // TODO 4: Generate RRF number here (moved from approve())
    // Only generate once — idempotent guard ensures re-runs are safe.
    const rrfNumber = rrf.rrfNumber ?? await this.generateRrfNumber();

    console.log(`[openForHiring] Executing optimized UPDATE query...`);

    const now = new Date();
    const statusHistoryEntry = {
      status: RrfStatus.IN_PROGRESS,
      action: 'SENT_TO_HR',
      changedById: userId,
      changedAt: now.toISOString(),
    };

    // ✅ OPTIMIZED: Direct UPDATE query instead of save()
    const updateResult = await this.rrfRepository
      .createQueryBuilder()
      .update(Rrf)
      .set({
        status: RrfStatus.IN_PROGRESS,
        sentToHrAt: now,
        rrfNumber,
        // ✅ PostgreSQL JSONB append
        statusHistory: () => `COALESCE(status_history, '[]'::jsonb) || '${JSON.stringify(statusHistoryEntry)}'::jsonb`,
      })
      .where('id = :id', { id })
      .returning('*')
      .execute();

    const updatedRrf = updateResult.raw[0];
    
    if (!updatedRrf) {
      throw new Error(`Failed to update RRF ${id}`);
    }

    console.log(`[openForHiring] SUCCESS - RRF ${id} opened for hiring in ${Date.now() - now.getTime()}ms`);
    return updatedRrf as Rrf;
  }

  async fillByBench(id: number, userId: number, candidateName?: string, joiningDate?: string): Promise<Rrf> {
    console.log(`[fillByBench] START - RRF ID: ${id}, User ID: ${userId}`);  // 🔍 Track start
    
    try {
      // ✅ PERFORMANCE FIX: Don't load relations for simple update operations
      console.log(`[fillByBench] Step 1: Finding RRF ${id}...`);
      const rrf = await this.findOne(id, false);  // includeRelations = false
      console.log(`[fillByBench] Step 1: Found RRF ${id}, status: ${rrf.status}`);

      // ✅ FIX: Allow filling from bench for both APPROVED and IN_PROGRESS
      // APPROVED: Direct fill (PMO decides not to open for hiring)
      // IN_PROGRESS: Already opened for hiring, but found bench resource
      const validStatuses = [RrfStatus.APPROVED, RrfStatus.IN_PROGRESS, RrfStatus.OPEN_FOR_HIRING];
      
      if (!validStatuses.includes(rrf.status as RrfStatus)) {
        console.error(`[fillByBench] Invalid status: ${rrf.status} for RRF ID: ${id}`);
        throw new BadRequestException(
          `Cannot fill from bench. Valid statuses: APPROVED or IN_PROGRESS. Current status: ${rrf.status}`,
        );
      }

      // Auto-generate Internal RRF Number
      console.log(`[fillByBench] Step 2: Generating internal RRF number...`);
      const internalRrfNo = await this.generateInternalRrfNumber();
      console.log(`[fillByBench] Step 2: Generated internal RRF number: ${internalRrfNo}`);

      // ✅ PERFORMANCE FIX: Use direct UPDATE query instead of save()
      // Why: save() loads entire entity, compares all fields, acquires locks
      // Result: 10x faster, no locks, no hanging
      console.log(`[fillByBench] Step 3: Executing optimized UPDATE query...`);
      
      const now = new Date();
      const joiningDateParsed = joiningDate ? new Date(joiningDate) : null;
      
      // Build status history entry
      const statusHistoryEntry = {
        status: RrfStatus.CLOSED,
        changedById: userId,
        changedAt: now.toISOString(),
        reason: `Filled by bench - Internal RRF: ${internalRrfNo}${candidateName ? `, Candidate: ${candidateName}` : ''}${joiningDate ? `, DOJ: ${joiningDate}` : ''}`,
      };

      // ✅ OPTIMIZED: Single UPDATE query with PostgreSQL JSONB append
      const updateResult = await this.rrfRepository
        .createQueryBuilder()
        .update(Rrf)
        .set({
          status: RrfStatus.CLOSED,
          closureStatus: 'filled-by-bench',
          closedAt: now,
          closedById: userId,
          internalRrfNo: internalRrfNo,
          candidateName: candidateName || null,
          joiningDate: joiningDateParsed,
          notes: `Position filled from internal bench. Internal RRF: ${internalRrfNo}`,
          // ✅ Use PostgreSQL's native JSONB append (|| operator)
          // This is MUCH faster than loading, modifying, and saving
          statusHistory: () => `COALESCE(status_history, '[]'::jsonb) || '${JSON.stringify(statusHistoryEntry)}'::jsonb`,
        })
        .where('id = :id', { id })
        .returning('*')  // Return updated row
        .execute();

      console.log(`[fillByBench] Step 3: UPDATE executed successfully`);

      // Get updated RRF from result
      const updatedRrf = updateResult.raw[0];
      
      if (!updatedRrf) {
        throw new Error(`Failed to update RRF ${id} - no rows affected`);
      }

      console.log(`[fillByBench] SUCCESS - RRF ${id} closed with internal RRF: ${internalRrfNo} in ${Date.now() - now.getTime()}ms`);
      
      // ✅ Return plain object (no need to reload entity)
      return updatedRrf as Rrf;
      
    } catch (error) {
      console.error(`[fillByBench] ERROR - RRF ${id}:`, error.message);
      console.error(`[fillByBench] ERROR Stack:`, error.stack);
      throw error;  // Re-throw to let NestJS handle it
    }
  }

  /**
   * Generate unique Internal RRF Number
   * Format: RRF-INT-XXX (e.g., RRF-INT-001, RRF-INT-002)
   * Ensures uniqueness by checking last generated number
   * 
   * ✅ FIX: Properly handles duplicates by incrementing from current max
   */
  private async generateInternalRrfNumber(attemptNumber: number = 1): Promise<string> {
    console.log(`[generateInternalRrfNumber] Attempt ${attemptNumber}`);  // 🔍 Debug log
    
    // ✅ FIX: Find the maximum internal RRF number in the database
    const result = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select('MAX(rrf.internalRrfNo)', 'maxInternalRrfNo')
      .where('rrf.internalRrfNo IS NOT NULL')
      .andWhere("rrf.internalRrfNo ~ '^RRF-INT-[0-9]+$'")  // Only valid format
      .getRawOne();

    let nextNumber = 1;

    if (result?.maxInternalRrfNo) {
      // Extract number from format RRF-INT-XXX
      const match = result.maxInternalRrfNo.match(/RRF-INT-(\d+)$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // ✅ In case of concurrent requests, add attempt offset
    nextNumber += (attemptNumber - 1);

    // Format: RRF-INT-001, RRF-INT-002, etc. (3-digit padding)
    const internalRrfNo = `RRF-INT-${String(nextNumber).padStart(3, '0')}`;
    
    console.log(`[generateInternalRrfNumber] Generated: ${internalRrfNo}`);  // 🔍 Debug log

    // ✅ FIX: Check uniqueness BEFORE returning, retry with incremented number
    const existing = await this.rrfRepository.findOne({
      where: { internalRrfNo },
    });

    if (existing) {
      console.warn(`[generateInternalRrfNumber] Duplicate found: ${internalRrfNo}, retrying...`);  // 🔍 Debug log
      
      // ✅ FIX: Increment attempt number instead of querying from scratch
      if (attemptNumber > 10) {
        // Prevent infinite loops in edge cases
        throw new Error(`Failed to generate unique internal RRF number after 10 attempts`);
      }
      
      return this.generateInternalRrfNumber(attemptNumber + 1);
    }

    console.log(`[generateInternalRrfNumber] Success: ${internalRrfNo} (unique)`);  // 🔍 Debug log
    return internalRrfNo;
  }

  private static readonly CLOSURE_STATUS_TO_REASON: Record<string, string> = {
    'Resource Hired (External Candidate)': 'RESOURCE_HIRED_EXTERNAL',
    'Sourced Internally': 'SOURCED_INTERNALLY',
    'Closed/Cancelled by Business': 'CLOSED_BY_BUSINESS',
  };

  async closeRrf(id: number, userId: number, candidateName?: string, joiningDate?: string, closureStatus?: string, notes?: string): Promise<Rrf> {
    const rrf = await this.findOne(id);

    if (
      rrf.status !== RrfStatus.IN_PROGRESS && 
      rrf.status !== RrfStatus.OPEN_FOR_HIRING && 
      rrf.status !== RrfStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Can only close RRFs that are approved or open for hiring. Current status: ${rrf.status}`,
      );
    }

    // Derive machine-readable key from the human-readable closureStatus label
    const closeReason = RrfService.CLOSURE_STATUS_TO_REASON[closureStatus] ?? null;

    // Auto-generate internal RRF number when fulfilled internally (replaces Fill From Bench)
    let internalRrfNo = rrf.internalRrfNo;
    if (closeReason === 'SOURCED_INTERNALLY' && !internalRrfNo) {
      internalRrfNo = await this.generateInternalRrfNumber();
    }

    rrf.status = RrfStatus.CLOSED;
    rrf.closedAt = new Date();
    rrf.closedById = userId;
    rrf.candidateName = candidateName;
    rrf.joiningDate = joiningDate ? new Date(joiningDate) : null;
    rrf.closureStatus = closureStatus;
    rrf.closeReason = closeReason;
    rrf.internalRrfNo = internalRrfNo;
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

  /**
   * Get pending approvals filtered by the approver's subfunctions (RBAC).
   * High performance implementation using repository filtering and Subfunction ID mapping.
   */
  async getPendingApprovals(user: AuthUser): Promise<Rrf[]> {
    const query: any = {
      where: { status: RrfStatus.PENDING },
      relations: ['createdBy', 'approvers', 'approvers.user', 'subFunctionEntity'],
      order: { submittedAt: 'DESC' },
    };

    // Strict Filter: Approvers see only their assigned business areas
    if (user.role.roleCode !== 'ADMIN') {
      const userSubfunctions = await this.userSubfunctionRepository.find({
        where: { userId: user.id },
      });
      const subIds = userSubfunctions.map((s) => s.subfunctionId);

      if (subIds.length === 0) {
        return []; // Security fallback: no assigned subfunctions = no data access
      }

      query.where.subFunctionId = In(subIds);
    }

    return await this.rrfRepository.find(query);
  }

  async getApprovedRrfs(): Promise<Rrf[]> {
    return await this.rrfRepository.find({
      where: [
        { status: RrfStatus.APPROVED },
        { status: RrfStatus.DECLINED },
        { status: RrfStatus.ON_HOLD },
        { status: RrfStatus.CLOSED },
        { status: RrfStatus.CLOSED_BY_BENCH },
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

    // Break down CLOSED records by closeReason
    const reasonRows: { closeReason: string; count: string }[] = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select('rrf.closeReason', 'closeReason')
      .addSelect('COUNT(*)', 'count')
      .where('rrf.status = :status AND rrf.closeReason IS NOT NULL', { status: RrfStatus.CLOSED })
      .groupBy('rrf.closeReason')
      .getRawMany();

    const closedByReason: Record<string, number> = {};
    for (const r of reasonRows) {
      closedByReason[r.closeReason] = parseInt(r.count, 10);
    }

    return {
      openedPositions,
      sentToHR,
      totalProcessed: openedPositions + sentToHR + totalClosed,
      closed: totalClosed,
      closedByReason: {
        RESOURCE_HIRED_EXTERNAL: closedByReason['RESOURCE_HIRED_EXTERNAL'] || 0,
        // Legacy CLOSED_BY_BENCH records fold into SOURCED_INTERNALLY until data migration runs
        SOURCED_INTERNALLY: (closedByReason['SOURCED_INTERNALLY'] || 0) + closedByBench,
        CLOSED_BY_BUSINESS: closedByReason['CLOSED_BY_BUSINESS'] || 0,
      },
    };
  }

  async getSuggestedInterviewers(techNames: string[]): Promise<User[]> {
    if (!techNames || techNames.length === 0) {
      return [];
    }

    const lowerTechs = techNames.map(t => t.toLowerCase());

    // Match users whose technologies array contains any of the requested techs (case-insensitive)
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere(`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(user.technologies) AS elem 
        WHERE LOWER(elem) = ANY(:lowerTechs)
      )`, { lowerTechs })
      .select([
        'user.id', 
        'user.fullName', 
        'user.email', 
        'user.technologies',
        'role.roleName'
      ])
      .getMany();
  }
}
