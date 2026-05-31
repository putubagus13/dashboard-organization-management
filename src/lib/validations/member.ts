import { z } from "zod";

export const memberSchema = z.object({
  full_name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  date_of_birth: z.string().optional(),
  gender: z.enum(["L", "P"]).optional(),
  address: z.string().max(255).optional(),
  rt_rw: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  status_id: z.string().uuid().optional(),
  role: z.enum(["ketua","wakil_ketua","sekretaris","bendahara","anggota","anggota_kehormatan"]).default("anggota"),
  join_date: z.string(),
  is_active: z.boolean().default(true),
  nik: z.string().max(16).optional(),
  occupation: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type MemberSchema = z.infer<typeof memberSchema>;
