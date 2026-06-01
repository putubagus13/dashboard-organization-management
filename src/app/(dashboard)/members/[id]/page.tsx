import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Award, Star, CreditCard } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Badge from "@/components/ui/badge";
import { formatDate, formatCurrency, formatPeriod } from "@/lib/utils/format";
import { generateInitials } from "@/lib/utils/helpers";
import type { Member, DuesPayment, Attendance } from "@/types";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from("members")
    .select("*, status:member_status_types(name,color)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !member) notFound();

  const [{ data: dues }, { data: attendances }] = await Promise.all([
    supabase.from("dues_payments")
      .select("*")
      .eq("member_id", id)
      .is("deleted_at", null)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .limit(12),
    supabase.from("attendance")
      .select("*, meeting:meetings(title,meeting_date,type)")
      .eq("member_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const m = member as Member;
  const duesPaid = (dues ?? []).filter(d => d.status === "paid").length;
  const duesPending = (dues ?? []).filter(d => d.status === "pending").length;
  const attPresent = (attendances ?? []).filter(a => a.status === "present").length;

  const infoRows = [
    { icon: User, label: "NIK", value: m.nik ?? "-" },
    { icon: Calendar, label: "Tanggal Lahir", value: formatDate(m.date_of_birth) },
    { icon: Phone, label: "Telepon", value: m.phone ?? "-" },
    { icon: Mail, label: "Email", value: m.email ?? "-" },
    { icon: MapPin, label: "Alamat", value: [m.address, m.rt_rw ? `RT/RW ${m.rt_rw}` : null].filter(Boolean).join(", ") || "-" },
    { icon: Calendar, label: "Bergabung", value: formatDate(m.join_date) },
    { icon: User, label: "Pekerjaan", value: m.occupation ?? "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <PageHeader title="Detail Anggota" description={`${m.member_number} · Bergabung ${formatDate(m.join_date)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bento-card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-brand-700 flex items-center justify-center">
            {m.photo_url
              ? <img src={m.photo_url} alt={m.full_name} className="w-20 h-20 rounded-2xl object-cover" />
              : <span className="font-display text-2xl font-bold text-white">{generateInitials(m.full_name)}</span>
            }
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">{m.full_name}</h2>
            <p className="text-slate-500 text-sm capitalize mt-1">{m.role.replace("_", " ")}</p>
            {m.status && (
              <div className="mt-2">
                <Badge variant="success" dot>{(m.status as { name: string }).name}</Badge>
              </div>
            )}
          </div>
          <div className="w-full pt-4 border-t border-slate-200 grid grid-cols-3 gap-3">
            {[
              { label: "Poin", value: m.activity_points, icon: Star, color: "text-amber-500" },
              { label: "Iuran Lunas", value: duesPaid, icon: CreditCard, color: "text-green-500" },
              { label: "Hadir", value: attPresent, icon: Award, color: "text-blue-500" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <stat.icon size={16} className={`${stat.color} mx-auto mb-1`} />
                <p className="font-display font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
          <Badge variant={m.is_active ? "success" : "default"} dot>
            {m.is_active ? "Anggota Aktif" : "Tidak Aktif"}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bento-card p-5">
            <h3 className="section-title mb-4">Informasi Pribadi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {infoRows.map(row => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <row.icon size={15} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{row.label}</p>
                    <p className="text-sm font-medium text-slate-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {m.notes && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-700 font-semibold mb-1">Catatan</p>
                <p className="text-sm text-amber-800">{m.notes}</p>
              </div>
            )}
          </div>

          {/* Dues History */}
          <div className="bento-card p-5">
            <h3 className="section-title mb-4">Riwayat Iuran</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(dues ?? []).map(d => (
                <div key={d.id} className={`p-3 rounded-xl border text-center ${
                  d.status === "paid" ? "bg-green-50 border-green-200" :
                  d.status === "pending" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}>
                  <p className="text-xs font-semibold text-slate-600">{formatPeriod(d.period_year, d.period_month)}</p>
                  <p className={`text-xs font-bold mt-1 ${
                    d.status === "paid" ? "text-green-700" : d.status === "pending" ? "text-amber-700" : "text-blue-700"
                  }`}>
                    {d.status === "paid" ? `✓ ${formatCurrency(d.amount)}` : d.status === "pending" ? "Belum Bayar" : "Dibebaskan"}
                  </p>
                </div>
              ))}
              {(!dues || dues.length === 0) && (
                <p className="col-span-3 text-sm text-slate-400 text-center py-4">Belum ada data iuran</p>
              )}
            </div>
          </div>

          {/* Attendance History */}
          <div className="bento-card p-5">
            <h3 className="section-title mb-4">Riwayat Kehadiran Rapat</h3>
            <div className="space-y-2">
              {(attendances ?? []).map(a => {
                const meeting = a.meeting as { title: string; meeting_date: string; type: string } | null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold
                      ${a.status === "present" ? "bg-green-100 text-green-700" : a.status === "excused" || a.status === "sick" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {a.status === "present" ? "H" : a.status === "excused" ? "I" : a.status === "sick" ? "S" : "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{meeting?.title ?? "-"}</p>
                      <p className="text-xs text-slate-400">{formatDate(meeting?.meeting_date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-600">+{a.points_earned} poin</p>
                    </div>
                  </div>
                );
              })}
              {(!attendances || attendances.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada data kehadiran</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
