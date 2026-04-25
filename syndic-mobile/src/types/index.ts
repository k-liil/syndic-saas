export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  ownerId: string | null;
  unitId: string | null;
  unitRef: string | null;
};

export type KPIDashboard = {
  totalReceipts: number;
  totalPayments: number;
  cashBalance: number;
  bankBalance: number;
  collectionRate: number;
  ownersCount: number;
  paidOwnersCount: number;
  receiptsByMonth: MonthAmount[];
  paymentsByMonth: MonthAmount[];
};

export type MonthAmount = {
  month: string;
  amount: number;
};

export type DueEntry = {
  id: string;
  period: string;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

export type PaymentEntry = {
  id: string;
  date: string;
  amount: number;
  reference?: string;
};

export type OwnerLedger = {
  remainingDueNowTotal: number;
  remainingFutureTotal: number;
  dueNow: DueEntry[];
  future: DueEntry[];
  payments: PaymentEntry[];
};

export type ClaimStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type ClaimPriority = "LOW" | "MEDIUM" | "HIGH";

export type Claim = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ClaimStatus;
  priority: ClaimPriority;
  createdAt: string;
  unit?: { lotNumber?: string; reference?: string } | null;
  owner?: { name: string; firstName?: string } | null;
  comments?: ClaimComment[];
};

export type ClaimComment = {
  id: string;
  content: string;
  createdAt: string;
  user?: { name?: string; email?: string } | null;
};

export type ClaimCategory =
  | "WATER"
  | "ELECTRICITY"
  | "ELEVATOR"
  | "COMMON_AREAS"
  | "HEATING"
  | "OTHER";
