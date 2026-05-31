"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Scale, Banknote, Package } from "lucide-react";
import { formatCurrency, formatWeight, formatDate } from "@/lib/utils/format";
import type { WasteCollectionSession, WasteCollection } from "@/types";

interface Props { session?: WasteCollectionSession; onAddCollection: () => void; }

export default function WasteCollectionDetail({ session, onAddCollection }: Props) {
  const supabase = createClient();
  const [collections, setCollections] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase.from("waste_collections")
      .select("*, collector:waste_collectors(name,rt_rw), items:waste_collection_items(*, waste_type:waste_types(name,color))")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setCollections((data as WasteCollection[]) ?? []); setLoading(false); });
  }, [session]);

  if (!session) return null;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-brand-50 border border-brand-200 p-3 text-center">
          <Scale size={18} className="text-brand-600 mx-auto mb-1" />
          <p className="font-display font-bold text-brand-700">{formatWeight(session.total_weight)}</p>
          <p className="text-xs text-slate-500">Total Berat</p>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
          <Banknote size={18} className="text-green-600 mx-auto mb-1" />
          <p className="font-display font-bold text-green-700">{formatCurrency(session.total_earnings)}</p>
          <p className="text-xs text-slate-500">Total Nilai</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
          <Package size={18} className="text-blue-600 mx-auto mb-1" />
          <p className="font-display font-bold text-blue-700">{collections.length}</p>
          <p className="text-xs text-slate-500">Jumlah Rumah</p>
        </div>
      </div>

      {session.status === "ongoing" && (
        <button onClick={onAddCollection} className="btn-primary w-full">
          <Plus size={15} /> Catat Sampah Baru
        </button>
      )}

      {/* Collection List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map(col => {
            const items = col.items ?? [];
            const collector = col.collector as { name: string; rt_rw: string | null } | null;
            return (
              <div key={col.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{collector?.name ?? "-"}</p>
                    {collector?.rt_rw && <p className="text-xs text-slate-400">RT/RW {collector.rt_rw}</p>}
                    <p className="text-xs text-slate-400">{formatDate(col.collected_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{formatWeight(col.total_weight)}</p>
                    <p className="text-sm font-bold text-brand-700">{formatCurrency(col.total_earnings)}</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => {
                      const wt = item.waste_type as { name: string; color: string } | null;
                      return (
                        <div key={item.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                          {wt && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: wt.color }} />}
                          <span className="text-slate-700">{wt?.name ?? "-"}</span>
                          <span className="font-semibold text-slate-900">{item.weight} kg</span>
                          <span className="text-slate-400">= {formatCurrency(item.subtotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {collections.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada catatan pengumpulan</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
