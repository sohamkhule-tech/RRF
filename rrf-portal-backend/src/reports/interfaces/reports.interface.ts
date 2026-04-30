export interface ReportKpi {
  revenueLoss: {
    totalLoss: number;
    count: number;
    currency: string;
  };
  avgDelay: {
    avgDays: number;
    count: number;
  };
  sourcedInternally: {
    count: number;
  };
  opportunityLost: {
    count: number;
  };
  avgClosingTime: {
    avgDays: number;
    count: number;
  };
}

export interface ReportRow {
  rrfNumber: string;
  customerName: string | null;
  projectName: string | null;
  headcount: number;
  status: string;
  billingRate: number | null;
  billingStartDate: string | null;
  expectedOnboardingDate: string | null;
  candidateName: string | null;
  sentToHrAt: string | null;
  joiningDate: string | null;
  closedAt: string | null;
  closeReason: string | null;
  closureStatus: string | null;
  internalRrfNo: string | null;
  closedByName: string | null;
  notes: string | null;
  // Computed fields
  delayDays?: number;
  revenueDelayDays?: number;
  revenueLoss?: number;
  closingTimeDays?: number;
}

export interface ReportDatasetResponse {
  data: ReportRow[];
  total: number;
  page: number;
  limit: number;
}

export type KpiType =
  | 'revenue-loss'
  | 'avg-delay'
  | 'sourced-internally'
  | 'opportunity-lost'
  | 'avg-closing-time';
