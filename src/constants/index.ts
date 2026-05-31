export const APP_NAME = 'STT Tunas Guna Dharma';
export const APP_SHORT_NAME = 'STT TGD';
export const APP_DESCRIPTION = 'Sistem Manajemen Organisasi STT Tunas Guna Dharma';

export const GENDER_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
] as const;

export const MEMBER_ROLE_OPTIONS = [
  { value: 'ketua', label: 'Ketua' },
  { value: 'wakil_ketua', label: 'Wakil Ketua' },
  { value: 'sekretaris', label: 'Sekretaris' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'anggota', label: 'Anggota' },
  { value: 'anggota_kehormatan', label: 'Anggota Kehormatan' },
] as const;

export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'income', label: 'Pemasukan' },
  { value: 'expense', label: 'Pengeluaran' },
] as const;

export const LOAN_STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'paid', label: 'Lunas' },
  { value: 'overdue', label: 'Jatuh Tempo' },
  { value: 'cancelled', label: 'Dibatalkan' },
] as const;

export const MEETING_TYPE_OPTIONS = [
  { value: 'regular', label: 'Rapat Rutin' },
  { value: 'extraordinary', label: 'Rapat Luar Biasa' },
  { value: 'annual', label: 'Rapat Tahunan' },
  { value: 'special', label: 'Rapat Khusus' },
] as const;

export const MEETING_STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'ongoing', label: 'Berlangsung' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', label: 'Hadir' },
  { value: 'absent', label: 'Tidak Hadir' },
  { value: 'excused', label: 'Izin' },
  { value: 'sick', label: 'Sakit' },
] as const;

export const DUES_STATUS_OPTIONS = [
  { value: 'paid', label: 'Lunas' },
  { value: 'pending', label: 'Belum Bayar' },
  { value: 'waived', label: 'Dibebaskan' },
] as const;

export const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
] as const;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/members', label: 'Anggota', icon: 'Users' },
  {
    label: 'Keuangan', icon: 'Wallet',
    children: [
      { href: '/finance', label: 'Ringkasan', icon: 'PieChart' },
      { href: '/finance/transactions', label: 'Transaksi', icon: 'ArrowLeftRight' },
      { href: '/finance/loans', label: 'Pinjaman', icon: 'Banknote' },
      { href: '/finance/donors', label: 'Donatur', icon: 'HeartHandshake' },
    ],
  },
  { href: '/attendance', label: 'Absensi Rapat', icon: 'CalendarCheck' },
  { href: '/dues', label: 'Iuran Anggota', icon: 'CreditCard' },
  {
    label: 'Bank Sampah', icon: 'Recycle',
    children: [
      { href: '/waste-bank', label: 'Ringkasan', icon: 'BarChart3' },
      { href: '/waste-bank/collections', label: 'Pengumpulan', icon: 'PackageSearch' },
      { href: '/waste-bank/leaderboard', label: 'Leaderboard', icon: 'Trophy' },
    ],
  },
] as const;
