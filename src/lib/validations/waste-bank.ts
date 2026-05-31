import { z } from "zod";

export const wasteSessionSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter").max(200),
  session_date: z.string(),
  location: z.string().max(255).optional(),
  officer_name: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const wasteCollectorSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  address: z.string().max(255).optional(),
  rt_rw: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  kk_number: z.string().max(20).optional(),
  is_member: z.boolean().default(false),
  member_id: z.string().uuid().optional(),
  notes: z.string().max(255).optional(),
});

export const wasteCollectionItemSchema = z.object({
  waste_type_id: z.string().uuid("Pilih jenis sampah"),
  weight: z.number().positive("Berat harus lebih dari 0"),
  price_per_kg: z.number().min(0),
});

export const wasteCollectionSchema = z.object({
  session_id: z.string().uuid(),
  collector_id: z.string().uuid("Pilih pengepul"),
  collected_date: z.string(),
  notes: z.string().max(500).optional(),
  items: z.array(wasteCollectionItemSchema).min(1, "Minimal 1 jenis sampah"),
});

export type WasteSessionSchema = z.infer<typeof wasteSessionSchema>;
export type WasteCollectorSchema = z.infer<typeof wasteCollectorSchema>;
export type WasteCollectionSchema = z.infer<typeof wasteCollectionSchema>;
