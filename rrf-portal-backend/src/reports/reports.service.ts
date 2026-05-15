import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Rrf, RrfStatus } from '../rrf/entities/rrf.entity';
import {
  ReportsQueryDto,
  ReportStatusFilter,
  ReportCloseReasonFilter,
  ReportKpiFilter,
} from './dto/reports-query.dto';
import { ReportKpi, ReportRow, ReportDatasetResponse } from './interfaces/reports.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Rrf)
    private readonly rrfRepository: Repository<Rrf>,
  ) {}

  /**
   * Get KPI aggregations for the reports dashboard
   */
  async getKpis(): Promise<ReportKpi> {
    const today = new Date();

    // Revenue Loss: IN_PROGRESS where today > billingStartDate
    const revenueLossRows = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select([
        'rrf.billingRate',
        'rrf.headcount',
        'rrf.billingStartDate',
      ])
      .where('rrf.status = :status', { status: RrfStatus.IN_PROGRESS })
      .andWhere('rrf.billingStartDate IS NOT NULL')
      .andWhere('rrf.billingStartDate < :today', { today })
      .getMany();

    let totalRevenueLoss = 0;
    for (const row of revenueLossRows) {
      const billingStart = new Date(row.billingStartDate);
      const delayDays = Math.max(0, Math.floor((today.getTime() - billingStart.getTime()) / 86400000));
      const rate = Number(row.billingRate) || 0;
      const headcount = Number(row.headcount) || 1;
      totalRevenueLoss += rate * headcount * delayDays;
    }

    // Avg Delay: IN_PROGRESS where today > expectedOnboardingDate
    const avgDelayRows = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select(['rrf.expectedOnboardingDate'])
      .where('rrf.status = :status', { status: RrfStatus.IN_PROGRESS })
      .andWhere('rrf.expectedOnboardingDate IS NOT NULL')
      .andWhere('rrf.expectedOnboardingDate < :today', { today })
      .getMany();

    let totalDelayDays = 0;
    for (const row of avgDelayRows) {
      const expected = new Date(row.expectedOnboardingDate);
      totalDelayDays += Math.max(0, Math.floor((today.getTime() - expected.getTime()) / 86400000));
    }
    const avgDelay = avgDelayRows.length > 0 ? Math.round(totalDelayDays / avgDelayRows.length) : 0;

    // Sourced Internally count
    const sourcedInternallyCount = await this.rrfRepository
      .createQueryBuilder('rrf')
      .where('rrf.status = :status', { status: RrfStatus.CLOSED })
      .andWhere('rrf.closeReason = :reason', { reason: 'SOURCED_INTERNALLY' })
      .getCount();

    // Opportunity Lost count
    const opportunityLostCount = await this.rrfRepository
      .createQueryBuilder('rrf')
      .where('rrf.status = :status', { status: RrfStatus.CLOSED })
      .andWhere('rrf.closeReason = :reason', { reason: 'CLOSED_BY_BUSINESS' })
      .getCount();

    // Avg Closing Time: CLOSED + RESOURCE_HIRED_EXTERNAL + sentToHrAt + joiningDate
    const closingTimeRows = await this.rrfRepository
      .createQueryBuilder('rrf')
      .select(['rrf.sentToHrAt', 'rrf.joiningDate'])
      .where('rrf.status = :status', { status: RrfStatus.CLOSED })
      .andWhere('rrf.closeReason = :reason', { reason: 'RESOURCE_HIRED_EXTERNAL' })
      .andWhere('rrf.sentToHrAt IS NOT NULL')
      .andWhere('rrf.joiningDate IS NOT NULL')
      .getMany();

    let totalClosingDays = 0;
    for (const row of closingTimeRows) {
      const opened = new Date(row.sentToHrAt);
      const joined = new Date(row.joiningDate);
      totalClosingDays += Math.max(0, Math.floor((joined.getTime() - opened.getTime()) / 86400000));
    }
    const avgClosingTime = closingTimeRows.length > 0 ? Math.round(totalClosingDays / closingTimeRows.length) : 0;

    return {
      revenueLoss: {
        totalLoss: Math.round(totalRevenueLoss * 100) / 100,
        count: revenueLossRows.length,
        currency: 'USD',
      },
      avgDelay: {
        avgDays: avgDelay,
        count: avgDelayRows.length,
      },
      sourcedInternally: {
        count: sourcedInternallyCount,
      },
      opportunityLost: {
        count: opportunityLostCount,
      },
      avgClosingTime: {
        avgDays: avgClosingTime,
        count: closingTimeRows.length,
      },
    };
  }

  /**
   * Get dataset for a specific KPI context or filtered view
   */
  async getDataset(query: ReportsQueryDto): Promise<ReportDatasetResponse> {
    const { page, limit, sortBy, sortOrder, kpi } = query;
    const skip = ((page || 1) - 1) * (limit || 20);
    const take = limit || 20;
    const today = new Date();

    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .leftJoinAndSelect('rrf.closedBy', 'closedBy');

    // Base filter: only IN_PROGRESS and CLOSED
    qb.where('rrf.status IN (:...statuses)', {
      statuses: [RrfStatus.IN_PROGRESS, RrfStatus.CLOSED],
    });

    // Apply KPI-specific filters.
    // General filters are passed so the KPI filter can skip conditions
    // that are already constrained by the user's explicit filter selection,
    // preventing AND closeReason=X AND closeReason=Y type conflicts.
    if (kpi) {
      this.applyKpiFilter(qb, kpi, today, query);
    }

    // Apply general filters
    this.applyGeneralFilters(qb, query);

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply sorting
    const validSortFields: Record<string, string> = {
      rrfNumber: 'rrf.rrfNumber',
      customerName: 'rrf.customerName',
      projectName: 'rrf.projectName',
      headcount: 'rrf.headcount',
      status: 'rrf.status',
      billingRate: 'rrf.billingRate',
      billingStartDate: 'rrf.billingStartDate',
      expectedOnboardingDate: 'rrf.expectedOnboardingDate',
      closedAt: 'rrf.closedAt',
      sentToHrAt: 'rrf.sentToHrAt',
      joiningDate: 'rrf.joiningDate',
    };

    const sortField = validSortFields[sortBy || 'rrfNumber'] || 'rrf.rrfNumber';
    qb.orderBy(sortField, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Apply pagination
    qb.skip(skip).take(take);

    const rows = await qb.getMany();

    // Map to response format with computed fields
    const data: ReportRow[] = rows.map((rrf) => this.mapToReportRow(rrf, today));

    return { data, total, page: page || 1, limit: take };
  }

  /**
   * Get full export dataset (no pagination)
   */
  async getExportData(query: ReportsQueryDto): Promise<ReportRow[]> {
    const today = new Date();

    const qb = this.rrfRepository
      .createQueryBuilder('rrf')
      .leftJoinAndSelect('rrf.closedBy', 'closedBy');

    qb.where('rrf.status IN (:...statuses)', {
      statuses: [RrfStatus.IN_PROGRESS, RrfStatus.CLOSED],
    });

    if (query.kpi) {
      this.applyKpiFilter(qb, query.kpi, today, query);
    }

    this.applyGeneralFilters(qb, query);

    qb.orderBy('rrf.rrfNumber', 'DESC');

    const rows = await qb.getMany();
    return rows.map((rrf) => this.mapToReportRow(rrf, today));
  }

  /**
   * Get full report export (all reportable RRFs)
   */
  async getFullReportExport(): Promise<ReportRow[]> {
    const today = new Date();

    const rows = await this.rrfRepository
      .createQueryBuilder('rrf')
      .leftJoinAndSelect('rrf.closedBy', 'closedBy')
      .where('rrf.status IN (:...statuses)', {
        statuses: [RrfStatus.IN_PROGRESS, RrfStatus.CLOSED],
      })
      .orderBy('rrf.rrfNumber', 'DESC')
      .getMany();

    return rows.map((rrf) => this.mapToReportRow(rrf, today));
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private applyKpiFilter(
    qb: SelectQueryBuilder<Rrf>,
    kpi: ReportKpiFilter,
    today: Date,
    query: ReportsQueryDto,
  ): void {
    // If the caller has already set an explicit status / closeReason filter via the
    // general filters, do NOT duplicate those constraints from the KPI block.
    // This prevents impossible AND conditions like:
    //   closeReason = 'CLOSED_BY_BUSINESS'   ← from kpi=opportunity-lost
    //   AND closeReason = 'RESOURCE_HIRED_EXTERNAL'  ← from manual filter override
    const statusOverridden =
      query.status && query.status !== ReportStatusFilter.ALL;
    const reasonOverridden =
      query.closeReason && query.closeReason !== ReportCloseReasonFilter.ALL;

    switch (kpi) {
      case ReportKpiFilter.REVENUE_LOSS:
        if (!statusOverridden) {
          qb.andWhere('rrf.status = :kpiStatus', { kpiStatus: RrfStatus.IN_PROGRESS });
        }
        // Date conditions are unique to this KPI – always apply them
        qb.andWhere('rrf.billingStartDate IS NOT NULL');
        qb.andWhere('rrf.billingStartDate < :today', { today });
        break;

      case ReportKpiFilter.AVG_DELAY:
        if (!statusOverridden) {
          qb.andWhere('rrf.status = :kpiStatus', { kpiStatus: RrfStatus.IN_PROGRESS });
        }
        qb.andWhere('rrf.expectedOnboardingDate IS NOT NULL');
        qb.andWhere('rrf.expectedOnboardingDate < :today', { today });
        break;

      case ReportKpiFilter.SOURCED_INTERNALLY:
        if (!statusOverridden) {
          qb.andWhere('rrf.status = :kpiStatus', { kpiStatus: RrfStatus.CLOSED });
        }
        if (!reasonOverridden) {
          qb.andWhere('rrf.closeReason = :kpiReason', { kpiReason: 'SOURCED_INTERNALLY' });
        }
        break;

      case ReportKpiFilter.OPPORTUNITY_LOST:
        if (!statusOverridden) {
          qb.andWhere('rrf.status = :kpiStatus', { kpiStatus: RrfStatus.CLOSED });
        }
        if (!reasonOverridden) {
          qb.andWhere('rrf.closeReason = :kpiReason', { kpiReason: 'CLOSED_BY_BUSINESS' });
        }
        break;

      case ReportKpiFilter.AVG_CLOSING_TIME:
        if (!statusOverridden) {
          qb.andWhere('rrf.status = :kpiStatus', { kpiStatus: RrfStatus.CLOSED });
        }
        if (!reasonOverridden) {
          qb.andWhere('rrf.closeReason = :kpiReason', { kpiReason: 'RESOURCE_HIRED_EXTERNAL' });
        }
        // Null conditions are unique to this KPI – always apply them
        qb.andWhere('rrf.sentToHrAt IS NOT NULL');
        qb.andWhere('rrf.joiningDate IS NOT NULL');
        break;
    }
  }

  private applyGeneralFilters(qb: SelectQueryBuilder<Rrf>, query: ReportsQueryDto): void {
    const { status, closeReason, search, dateFrom, dateTo } = query;

    if (status && status !== ReportStatusFilter.ALL) {
      qb.andWhere('rrf.status = :filterStatus', { filterStatus: status });
    }

    if (closeReason && closeReason !== ReportCloseReasonFilter.ALL) {
      qb.andWhere('rrf.closeReason = :filterReason', { filterReason: closeReason });
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      qb.andWhere(
        '(rrf.rrfNumber ILIKE :search OR rrf.customerName ILIKE :search OR rrf.projectName ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (dateFrom) {
      qb.andWhere('rrf.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      qb.andWhere('rrf.createdAt <= :dateTo', { dateTo: endDate });
    }
  }

  private mapToReportRow(rrf: Rrf, today: Date): ReportRow {
    const billingStart = rrf.billingStartDate ? new Date(rrf.billingStartDate) : null;
    const expectedOnboarding = rrf.expectedOnboardingDate ? new Date(rrf.expectedOnboardingDate) : null;
    const sentToHr = rrf.sentToHrAt ? new Date(rrf.sentToHrAt) : null;
    const joining = rrf.joiningDate ? new Date(rrf.joiningDate) : null;

    // Revenue delay days
    const revenueDelayDays =
      billingStart && rrf.status === RrfStatus.IN_PROGRESS && today > billingStart
        ? Math.max(0, Math.floor((today.getTime() - billingStart.getTime()) / 86400000))
        : 0;

    // General delay days
    const delayDays =
      expectedOnboarding && rrf.status === RrfStatus.IN_PROGRESS && today > expectedOnboarding
        ? Math.max(0, Math.floor((today.getTime() - expectedOnboarding.getTime()) / 86400000))
        : 0;

    // Revenue loss
    const revenueLoss = revenueDelayDays > 0
      ? (Number(rrf.billingRate) || 0) * (Number(rrf.headcount) || 1) * revenueDelayDays
      : 0;

    // Closing time days
    const closingTimeDays =
      sentToHr && joining
        ? Math.max(0, Math.floor((joining.getTime() - sentToHr.getTime()) / 86400000))
        : null;

    return {
      rrfNumber: rrf.rrfNumber || rrf.subId || `RRF-${rrf.id}`,
      customerName: rrf.customerName || null,
      projectName: rrf.projectName || null,
      headcount: rrf.headcount || 1,
      status: rrf.status,
      billingRate: rrf.billingRate ? Number(rrf.billingRate) : null,
      billingStartDate: rrf.billingStartDate ? rrf.billingStartDate.toISOString() : null,
      expectedOnboardingDate: rrf.expectedOnboardingDate ? rrf.expectedOnboardingDate.toISOString() : null,
      candidateName: rrf.candidateName || null,
      sentToHrAt: rrf.sentToHrAt ? rrf.sentToHrAt.toISOString() : null,
      joiningDate: rrf.joiningDate ? rrf.joiningDate.toISOString() : null,
      closedAt: rrf.closedAt ? rrf.closedAt.toISOString() : null,
      closeReason: rrf.closeReason || null,
      closureStatus: rrf.closureStatus || null,
      internalRrfNo: rrf.internalRrfNo || null,
      closedByName: rrf.closedBy?.fullName || null,
      notes: rrf.notes || null,
      delayDays,
      revenueDelayDays,
      revenueLoss: Math.round(revenueLoss * 100) / 100,
      closingTimeDays: closingTimeDays ?? undefined,
    };
  }
}
