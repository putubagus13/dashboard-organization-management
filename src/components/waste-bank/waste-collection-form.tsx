"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withCreateAudit } from "@/lib/audit";
import { Loader2, Plus, Trash2, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import type { WasteCollectionSession, WasteType, WasteCollector } from "@/types";

interface ItemRow { waste_type_id: string; weight: number; price_per_kg: number; }
interface Props { session?: WasteCollectionSession; onSuccess: () => void; onCancel: () => void; }

export default function WasteCollectionForm({ session, onSuccess, onCancel }: Props) {
  const supabase = createClient();
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [collectors, setCollectors] = useState<WasteCollector[]>([]);
  const [filteredCollectors, setFilteredCollectors] = useState<WasteCollector[]>([]);
  const [collectorSearch, setCollectorSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState<WasteCollector | null>(null);
  const [items, setItems] = useState<ItemRow[]>([{ waste_type_id: "", weight: 0, price_per_kg: 0 }]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRtRw, setNewRtRw] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("waste_types").select("*").eq("is_active", true).is("deleted_at", null).order("name"),
      supabase.from("waste_collectors").select("*").is("deleted_at", null).order("name"),
    ]).then(([{ data: wt }, { data: col }]) => {
      setWasteTypes(wt ?? []);
      setCollectors((col as WasteCollector[]) ?? []);
      setFilteredCollectors((col as WasteCollector[]) ?? []);
      if (wt && wt.length > 0) {
        setItems([{ waste_type_id: wt[0].id, weight: 0, price_per_kg: wt[0].price_per_kg }]);
      }
    });
  }, []);

  useEffect(() => {
    const q = collectorSearch.toLowerCase();
    setFilteredCollectors(collectors.filter(c => c.name.toLowerCase().includes(q)));
  }, [collectorSearch, collectors]);

  function addItem() {
    setItems(prev => [...prev, { waste_type_id: wasteTypes[0]?.id ?? "", weight: 0, price_per_kg: wasteTypes[0]?.price_per_kg ?? 0 }]);
  }

  function removeItem(idx: number) { setItems(prev => prev.filter((_, i) => i !== idx)); }

  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "waste_type_id") {
        const wt = wasteTypes.find(w => w.id === value);
        if (wt) updated.price_per_kg = wt.price_per_kg;
      }
      return updated;
    }));
  }

  const total = items.reduce((s, item) => s + item.weight * item.price_per_kg, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { setError("Sesi tidak ditemukan"); return; }
    if (!selectedCollector && !createNew) { setError("Pilih atau buat pengepul terlebih dahulu"); return; }
    if (items.some(item => !item.waste_type_id || item.weight <= 0)) {
      setError("Pastikan semua item sampah memiliki jenis dan berat yang valid"); return;
    }
    setLoading(true); setError("");

    let collectorId = selectedCollector?.id;
    if (createNew) {
      const { data: newColl, error: collErr } = await supabase
        .from("waste_collectors")
        .insert(await withCreateAudit(supabase, { name: newName, rt_rw: newRtRw || null, phone: newPhone || null }))
        .select().single();
      if (collErr) { setError(collErr.message); setLoading(false); return; }
      collectorId = (newColl as WasteCollector).id;
    }

    const { data: collection, error: collErr } = await supabase
      .from("waste_collections")
      .insert(await withCreateAudit(supabase, { session_id: session.id, collector_id: collectorId!, collected_date: date, notes: notes || null }))
      .select().single();
    if (collErr) { setError(collErr.message); setLoading(false); return; }

    const itemsToInsert = items.map(item => ({
      collection_id: (collection as { id: string }).id,
      waste_type_id: item.waste_type_id,
      weight: item.weight,
      price_per_kg: item.price_per_kg,
      subtotal: item.weight * item.price_per_kg,
    }));

    const { error: itemErr } = await supabase.from("waste_collection_items").insert(await Promise.all(itemsToInsert.map(item => withCreateAudit(supabase, item))));
    if (itemErr) { setError(itemErr.message); setLoading(false); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Session Info */}
      {session && (
        <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">Sesi: {session.title}</p>
          <p className="text-xs text-brand-600">{session.session_date}</p>
        </div>
      )}

      {/* Collector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-700">Pengepul *</label>
          <button type="button" onClick={() => { setCreateNew(!createNew); setSelectedCollector(null); }}
            className="text-xs text-brand-700 hover:underline">
            {createNew ? "← Pilih yang ada" : "+ Pengepul baru"}
          </button>
        </div>

        {createNew ? (
          <div className="space-y-3 p-4 rounded-xl border border-brand-200 bg-brand-50">
            <p className="text-xs font-semibold text-brand-700">Data Pengepul Baru</p>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nama lengkap *" className="input-base" required />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={newRtRw} onChange={e => setNewRtRw(e.target.value)}
                placeholder="RT/RW (mis: 001/002)" className="input-base" />
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                placeholder="No. Telepon" className="input-base" />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={collectorSearch}
                  onChange={e => { setCollectorSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Cari nama pengepul..."
                  className="input-base pl-8" />
              </div>
            </div>
            {selectedCollector && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-50 border border-brand-200">
                <div className="w-7 h-7 rounded-lg bg-brand-700 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{selectedCollector.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-800">{selectedCollector.name}</p>
                  {selectedCollector.rt_rw && <p className="text-xs text-brand-600">RT/RW {selectedCollector.rt_rw}</p>}
                </div>
                <button type="button" onClick={() => setSelectedCollector(null)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
              </div>
            )}
            {showDropdown && !selectedCollector && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredCollectors.length === 0
                  ? <p className="px-4 py-3 text-sm text-slate-400">Tidak ditemukan</p>
                  : filteredCollectors.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelectedCollector(c); setCollectorSearch(c.name); setShowDropdown(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 text-left">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          {c.rt_rw && <p className="text-xs text-slate-400">RT/RW {c.rt_rw}</p>}
                        </div>
                      </button>
                    ))
                }
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Pengambilan</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base w-48" />
      </div>

      {/* Waste Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-slate-700">Daftar Sampah *</label>
          <button type="button" onClick={addItem} className="btn-secondary text-xs py-1.5">
            <Plus size={12} /> Tambah Jenis
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const wt = wasteTypes.find(w => w.id === item.waste_type_id);
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="col-span-4">
                  <select value={item.waste_type_id}
                    onChange={e => updateItem(idx, "waste_type_id", e.target.value)}
                    className="input-base text-sm py-1.5">
                    {wasteTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <input type="number" min="0" step="0.001" value={item.weight}
                      onChange={e => updateItem(idx, "weight", parseFloat(e.target.value) || 0)}
                      className="input-base text-sm py-1.5 pr-8" placeholder="0.000" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">kg</span>
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-600">
                    {formatCurrency(item.weight * item.price_per_kg)}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className="text-xs text-slate-400">{formatCurrency(item.price_per_kg)}/kg</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <div className="px-4 py-2 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-sm text-slate-600">Total: </span>
            <span className="font-display font-bold text-brand-700">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-base" />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Batal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Simpan Catatan
        </button>
      </div>
    </form>
  );
}
