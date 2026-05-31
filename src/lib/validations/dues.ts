import { z } from "zod";

export const duesSettingSchema = z.object({
  status_id: z.string().uuid("Pilih status anggota"),
  amount: z.number().min(0, "Nominal tidak boleh negatif"),
  effective_from: z.string(),
  effective_until: z.string().optional(),
  notes: z.string().max(255).optional(),
});

export const duesPaymentSchema = z.object({
  member_id: z.string().uuid("Pilih anggota"),
  period_year: z.number().int().min(2020),
  period_month: z.number().int().min(1).max(12),
  amount: z.number().min(0),
  payment_date: z.string(),
  status: z.enum(["paid","pending","waived"]).default("paid"),
  notes: z.string().max(255).optional(),
});

export type DuesSettingSchema = z.infer<typeof duesSettingSchema>;
export type DuesPaymentSchema = z.infer<typeof duesPaymentSchema>;
