import { z } from "zod";

export const transactionSchema = z.object({
  account_id: z.string().uuid("Pilih rekening"),
  type: z.enum(["income", "expense", "transfer"]),
  category_id: z.string().uuid().optional(),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  description: z.string().min(1, "Keterangan wajib diisi").max(255),
  reference_no: z.string().max(50).optional(),
  donor_id: z.string().uuid().optional(),
  member_id: z.string().uuid().optional(),
  transaction_date: z.string(),
  notes: z.string().max(500).optional(),
});

export const loanSchema = z.object({
  borrower_name: z.string().min(2, "Nama minimal 2 karakter"),
  member_id: z.string().uuid().optional(),
  account_id: z.string().uuid("Pilih rekening"),
  principal_amount: z.number().positive("Jumlah pinjaman harus lebih dari 0"),
  interest_rate: z.number().min(0).max(100).default(0),
  loan_date: z.string(),
  due_date: z.string().optional(),
  purpose: z.string().max(255).optional(),
  collateral: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
});

export type TransactionSchema = z.infer<typeof transactionSchema>;
export type LoanSchema = z.infer<typeof loanSchema>;
