/**
 * Centralized query key factories.
 *
 * Each domain has:
 *   - `all`    : base key for invalidating everything in the domain
 *   - `lists`  : base key for all list queries
 *   - `list`   : specific list query with filters
 *   - `details`: base key for all detail queries
 *   - `detail` : specific detail query by id
 */

export const queryKeys = {
  members: {
    all: ['members'] as const,
    lists: ['members', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['members', 'list', filters] as const,
    details: ['members', 'detail'] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
    allActive: ['members', 'allActive'] as const,
  },

  finance: {
    all: ['finance'] as const,
    accounts: ['finance', 'accounts'] as const,
    transactions: {
      all: ['finance', 'transactions'] as const,
      list: (filters: Record<string, unknown>) => ['finance', 'transactions', 'list', filters] as const,
    },
    loans: {
      all: ['finance', 'loans'] as const,
      list: (filters: Record<string, unknown>) => ['finance', 'loans', 'list', filters] as const,
      detail: (id: string) => ['finance', 'loans', 'detail', id] as const,
      active: ['finance', 'loans', 'active'] as const,
    },
    donors: {
      all: ['finance', 'donors'] as const,
      list: (filters: Record<string, unknown>) => ['finance', 'donors', 'list', filters] as const,
    },
  },

  attendance: {
    all: ['attendance'] as const,
    meetings: {
      all: ['attendance', 'meetings'] as const,
      list: (filters: Record<string, unknown>) => ['attendance', 'meetings', 'list', filters] as const,
      detail: (id: string) => ['attendance', 'meetings', 'detail', id] as const,
    },
  },

  dues: {
    all: ['dues'] as const,
    settings: ['dues', 'settings'] as const,
    payments: (filters: Record<string, unknown>) => ['dues', 'payments', filters] as const,
  },

  wasteBank: {
    all: ['wasteBank'] as const,
    wasteTypes: ['wasteBank', 'wasteTypes'] as const,
    collectors: (search?: string) => ['wasteBank', 'collectors', search ?? ''] as const,
    sessions: {
      all: ['wasteBank', 'sessions'] as const,
      list: (filters: Record<string, unknown>) => ['wasteBank', 'sessions', 'list', filters] as const,
      detail: (id: string) => ['wasteBank', 'sessions', 'detail', id] as const,
    },
    leaderboard: (filters: Record<string, unknown>) => ['wasteBank', 'leaderboard', filters] as const,
  },

  dashboard: {
    all: ['dashboard'] as const,
    stats: ['dashboard', 'stats'] as const,
  },
} as const;
