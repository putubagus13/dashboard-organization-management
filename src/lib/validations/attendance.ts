import { z } from "zod";

export const meetingSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().max(1000).optional(),
  meeting_date: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().max(255).optional(),
  type: z.enum(["regular","extraordinary","annual","special"]).default("regular"),
  agenda: z.string().max(2000).optional(),
});

export const attendanceSchema = z.object({
  meeting_id: z.string().uuid(),
  member_id: z.string().uuid(),
  status: z.enum(["present","absent","excused","sick"]),
  points_earned: z.number().min(0).default(0),
  notes: z.string().max(255).optional(),
});

export type MeetingSchema = z.infer<typeof meetingSchema>;
export type AttendanceSchema = z.infer<typeof attendanceSchema>;
