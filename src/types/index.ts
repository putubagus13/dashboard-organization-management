export type GenderType = 'L' | 'P';
export type MemberRole = 'ketua' | 'wakil_ketua' | 'sekretaris' | 'bendahara' | 'anggota' | 'anggota_kehormatan';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type LoanStatus = 'active' | 'paid' | 'overdue' | 'cancelled';
export type MeetingType = 'regular' | 'extraordinary' | 'annual' | 'special';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'sick';
export type DuesPaymentStatus = 'paid' | 'pending' | 'waived';
export type WasteSessionStatus = 'ongoing' | 'completed' | 'cancelled';
export type AppUserRole = 'superadmin' | 'admin' | 'treasurer' | 'secretary' | 'member';

export interface Profile {
  id: string; email: string; full_name: string | null;
  avatar_url: string | null; role: AppUserRole;
  is_active: boolean; created_at: string; updated_at: string;
}

export interface MemberStatusType {
  id: string; name: string; description: string | null;
  color: string; created_at: string; updated_at: string;
}

export interface Member {
  id: string; member_number: string | null; full_name: string;
  date_of_birth: string | null; gender: GenderType | null;
  address: string | null; rt_rw: string | null;
  phone: string | null; email: string | null;
  status_id: string | null; role: MemberRole;
  join_date: string; is_active: boolean; profile_id: string | null;
  activity_points: number; photo_url: string | null;
  nik: string | null; occupation: string | null; notes: string | null;
  created_at: string; updated_at: string;
  status?: MemberStatusType | null;
}

export interface MemberFormData {
  full_name: string; date_of_birth?: string; gender?: GenderType;
  address?: string; rt_rw?: string; phone?: string; email?: string;
  status_id?: string; role?: MemberRole; join_date?: string;
  is_active?: boolean; nik?: string; occupation?: string; notes?: string;
}

export interface CashAccount {
  id: string; name: string; description: string | null;
  balance: number; is_active: boolean; created_at: string; updated_at: string;
}

export interface TransactionCategory {
  id: string; name: string; type: TransactionType;
  description: string | null; color: string;
  is_active: boolean; created_at: string;
}

export interface Donor {
  id: string; name: string; phone: string | null;
  email: string | null; address: string | null;
  total_donated: number; is_member: boolean;
  member_id: string | null; notes: string | null;
  created_at: string; updated_at: string;
  member?: Member | null;
}

export interface CashTransaction {
  id: string; account_id: string; type: TransactionType;
  category_id: string | null; amount: number; description: string;
  reference_no: string | null; donor_id: string | null;
  member_id: string | null; transaction_date: string;
  recorded_by: string | null; attachment_url: string | null;
  is_verified: boolean; notes: string | null;
  created_at: string; updated_at: string;
  account?: CashAccount | null; category?: TransactionCategory | null;
  donor?: Donor | null; member?: Member | null; recorder?: Profile | null;
}

export interface TransactionFormData {
  account_id: string; type: TransactionType; category_id?: string;
  amount: number; description: string; reference_no?: string;
  donor_id?: string; member_id?: string;
  transaction_date: string; notes?: string;
}

export interface Loan {
  id: string; loan_number: string | null; borrower_name: string;
  member_id: string | null; account_id: string;
  principal_amount: number; interest_rate: number;
  loan_date: string; due_date: string | null; status: LoanStatus;
  total_paid: number; remaining_amount: number | null;
  purpose: string | null; collateral: string | null; notes: string | null;
  approved_by: string | null; created_at: string; updated_at: string;
  member?: Member | null; account?: CashAccount | null; payments?: LoanPayment[];
}

export interface LoanFormData {
  borrower_name: string; member_id?: string; account_id: string;
  principal_amount: number; interest_rate?: number;
  loan_date: string; due_date?: string; purpose?: string;
  collateral?: string; notes?: string;
}

export interface LoanPayment {
  id: string; loan_id: string; amount: number;
  payment_date: string; notes: string | null;
  recorded_by: string | null; transaction_id: string | null; created_at: string;
}

export interface Meeting {
  id: string; title: string; description: string | null;
  meeting_date: string; start_time: string | null; end_time: string | null;
  location: string | null; type: MeetingType; status: MeetingStatus;
  agenda: string | null; minutes: string | null; created_by: string | null;
  created_at: string; updated_at: string;
  attendance?: Attendance[]; attendance_count?: number;
}

export interface MeetingFormData {
  title: string; description?: string; meeting_date: string;
  start_time?: string; end_time?: string; location?: string;
  type?: MeetingType; agenda?: string;
}

export interface Attendance {
  id: string; meeting_id: string; member_id: string;
  status: AttendanceStatus; check_in_time: string | null;
  points_earned: number; notes: string | null; recorded_by: string | null;
  created_at: string; updated_at: string;
  member?: Member | null; meeting?: Meeting | null;
}

export interface PointsConfig {
  id: string; action: string; label: string;
  points: number; description: string | null;
  created_at: string; updated_at: string;
}

export interface DuesSetting {
  id: string; status_id: string; amount: number;
  effective_from: string; effective_until: string | null;
  is_active: boolean; notes: string | null; created_by: string | null;
  created_at: string; updated_at: string;
  status?: MemberStatusType | null;
}

export interface DuesPayment {
  id: string; member_id: string;
  period_year: number; period_month: number;
  amount: number; payment_date: string; status: DuesPaymentStatus;
  transaction_id: string | null; recorded_by: string | null;
  notes: string | null; created_at: string; updated_at: string;
  member?: Member | null;
}

export interface DuesPaymentFormData {
  member_id: string; period_year: number; period_month: number;
  amount: number; payment_date: string; notes?: string;
}

export interface WasteCollector {
  id: string; name: string; address: string | null;
  rt_rw: string | null; phone: string | null; kk_number: string | null;
  is_member: boolean; member_id: string | null;
  total_weight: number; total_earnings: number;
  notes: string | null; created_at: string; updated_at: string;
  member?: Member | null;
}

export interface WasteType {
  id: string; name: string; description: string | null;
  price_per_kg: number; color: string; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface WasteCollectionSession {
  id: string; session_date: string; title: string;
  location: string | null; officer_name: string | null;
  status: WasteSessionStatus; total_weight: number; total_earnings: number;
  notes: string | null; created_by: string | null;
  created_at: string; updated_at: string;
  collections?: WasteCollection[]; collection_count?: number;
}

export interface WasteCollection {
  id: string; session_id: string; collector_id: string;
  collected_date: string; total_weight: number; total_earnings: number;
  notes: string | null; recorded_by: string | null;
  created_at: string; updated_at: string;
  collector?: WasteCollector | null; items?: WasteCollectionItem[];
}

export interface WasteCollectionItem {
  id: string; collection_id: string; waste_type_id: string;
  weight: number; price_per_kg: number; subtotal: number; created_at: string;
  waste_type?: WasteType | null;
}

export interface WasteCollectionFormData {
  collector_id: string; session_id: string; collected_date: string;
  notes?: string;
  items: { waste_type_id: string; weight: number; price_per_kg: number; }[];
}

export interface LeaderboardEntry {
  rank: number; collector: WasteCollector;
  total_weight: number; total_earnings: number; collection_count: number;
}

export interface DashboardStats {
  members: { total: number; active: number; new_this_month: number; };
  finance: { total_balance: number; income_this_month: number; expense_this_month: number; active_loans: number; };
  attendance: { upcoming_meetings: number; last_meeting_rate: number; };
  dues: { paid_this_month: number; pending_this_month: number; collection_rate: number; };
  waste_bank: { total_weight_this_month: number; total_earnings_this_month: number; sessions_this_month: number; };
}

export interface ApiResponse<T> {
  data: T | null; error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[]; count: number; page: number; pageSize: number; totalPages: number;
}

export interface FilterParams {
  search?: string; page?: number; pageSize?: number;
  sortBy?: string; sortOrder?: 'asc' | 'desc';
}

// ─── Partial shapes for Supabase joined queries ───────────────────────────────
export interface MemberMinimal {
  id: string;
  full_name: string;
  member_number: string | null;
  status_id?: string | null;
  status?: MemberStatusType | null;
  is_active?: boolean;
}
