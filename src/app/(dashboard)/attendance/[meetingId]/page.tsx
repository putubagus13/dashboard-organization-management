"use client";
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { getAttendanceStatusColor } from "@/lib/utils/helpers";
import type { Meeting, MemberMinimal, AttendanceStatus } from "@/types";
import { ATTENDANCE_STATUS_OPTIONS } from "@/constants";

interface AttendanceRow {
  memberId: string;
  status: AttendanceStatus;
  notes: string;
  points: number;
}

export default function MeetingAttendancePage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = use(params);
  const supabase = createClient();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [members, setMembers] = useState<MemberMinimal[]>([]);
  const [rows, setRows] = useState<Record<string, AttendanceRow>>({});
  const [pointsConfig, setPointsConfig] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const [meetingRes, membersRes, attendanceRes, pointsRes] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", meetingId).single(),
        supabase
          .from("members")
          .select("id,full_name,member_number")
          .eq("is_active", true)
          .order("full_name"),
        supabase.from("attendance").select("*").eq("meeting_id", meetingId),
        supabase.from("points_config").select("action,points"),
      ]);

      setMeeting(meetingRes.data as Meeting);
      const memberList = (membersRes.data ?? []) as MemberMinimal[];
      setMembers(memberList);

      const pc: Record<string, number> = {};
      (pointsRes.data ?? []).forEach(
        (p: { action: string; points: number }) => { pc[p.action] = p.points; }
      );
      setPointsConfig(pc);

      const existing: Record<string, AttendanceRow> = {};
      (attendanceRes.data ?? []).forEach(
        (a: { member_id: string; status: AttendanceStatus; notes: string | null; points_earned: number }) => {
          existing[a.member_id] = {
            memberId: a.member_id,
            status: a.status,
            notes: a.notes ?? "",
            points: a.points_earned,
          };
        }
      );
      memberList.forEach((m) => {
        if (!existing[m.id]) {
          existing[m.id] = { memberId: m.id, status: "absent", notes: "", points: 0 };
        }
      });
      setRows(existing);
      setLoading(false);
    }
    load();
  }, [meetingId]);

  function updateRow(
    memberId: string,
    field: keyof AttendanceRow,
    value: string | number | AttendanceStatus
  ) {
    setRows((prev) => {
      const updated = { ...prev, [memberId]: { ...prev[memberId], [field]: value } };
      if (field === "status") {
        const statusKey = `attendance_${value as string}`;
        const pts =
          pointsConfig[statusKey] ??
          (value === "present" ? 10 : value === "excused" || value === "sick" ? 5 : 0);
        updated[memberId].points = pts;
      }
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    const upsertData = Object.values(rows).map((r) => ({
      meeting_id: meetingId,
      member_id: r.memberId,
      status: r.status,
      points_earned: r.points,
      notes: r.notes || null,
    }));
    await supabase
      .from("attendance")
      .upsert(upsertData, { onConflict: "meeting_id,member_id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function markAll(status: AttendanceStatus) {
    setRows((prev) => {
      const updated = { ...prev };
      const pts =
        pointsConfig[`attendance_${status}`] ??
        (status === "present" ? 10 : status === "excused" || status === "sick" ? 5 : 0);
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status, points: pts };
      });
      return updated;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    );
  }

  const presentCount = Object.values(rows).filter((r) => r.status === "present").length;
  const pct = members.length > 0 ? Math.round((presentCount / members.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/attendance"
          className="mt-1 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="page-title">{meeting?.title}</h1>
          <p className="text-slate-500 text-sm">
            {formatDate(meeting?.meeting_date ?? "")}
            {meeting?.start_time ? ` · ${meeting.start_time}` : ""}
            {meeting?.location ? ` · ${meeting.location}` : ""}
          </p>
        </div>
      </div>

      <div className="bento-card p-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-slate-600">
                <span className="font-display text-2xl font-bold text-brand-700">{presentCount}</span>
                <span className="text-slate-400"> / {members.length}</span>
                <span className="ml-1 text-sm text-slate-500">hadir ({pct}%)</span>
              </p>
              <div className="w-40 bg-slate-200 rounded-full h-1.5 mt-1">
                <div
                  className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Tandai semua:</span>
            {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => markAll(opt.value as AttendanceStatus)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium transition-colors">
                {opt.label}
              </button>
            ))}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn-primary ml-1 ${saved ? "bg-green-600 hover:bg-green-700" : ""}`}>
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saved ? "Tersimpan!" : "Simpan"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Anggota</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-20">Poin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.map((m, i) => {
                const row = rows[m.id] ?? {
                  status: "absent" as AttendanceStatus,
                  notes: "",
                  points: 0,
                };
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.full_name}</p>
                      <p className="text-xs text-slate-400">{m.member_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          updateRow(m.id, "status", e.target.value as AttendanceStatus)
                        }
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-brand-300 focus:outline-none cursor-pointer ${getAttendanceStatusColor(row.status)}`}>
                        {ATTENDANCE_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={row.points}
                        onChange={(e) =>
                          updateRow(m.id, "points", Number(e.target.value))
                        }
                        className="w-16 text-xs text-center rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:border-brand-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateRow(m.id, "notes", e.target.value)}
                        placeholder="Catatan opsional..."
                        className="input-base text-xs py-1.5 w-full max-w-xs"
                      />
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Belum ada anggota aktif
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
