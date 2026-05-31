"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, LogOut, ChevronDown, User } from "lucide-react";
import { generateInitials } from "@/lib/utils/helpers";
import { useState } from "react";
import type { Profile } from "@/types";

export default function Header({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const name = profile?.full_name ?? profile?.email ?? "User";
  const initials = generateInitials(name);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* <button className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <Bell size={16} className="text-slate-600" />
        </button> */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="w-8 h-8 rounded-lg object-cover"
                  alt={name}
                />
              ) : (
                <span className="text-xs font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {name}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {profile?.role ?? "admin"}
              </p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              {/* <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <User size={14} />Profil Saya
              </button> */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
