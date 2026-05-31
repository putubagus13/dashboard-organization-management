"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, Chrome } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/dashboard"); router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="input-base" placeholder="nama@email.com" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
        <div className="relative">
          <input type={showPw ? "text" : "password"} value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-base pr-10" placeholder="••••••••" required />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-brand-700 hover:underline">Lupa password?</Link>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <><Loader2 size={16} className="animate-spin" />Masuk...</> : "Masuk"}
      </button>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">atau</span></div>
      </div>
      <button type="button" onClick={handleGoogle} disabled={googleLoading} className="btn-secondary w-full">
        {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <Chrome size={16} />}
        Masuk dengan Google
      </button>
      <p className="text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">Daftar sekarang</Link>
      </p>
    </form>
  );
}
