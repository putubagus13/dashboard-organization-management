"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Password tidak cocok");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${location.origin}/api/auth/callback`,
      },
    });
    if (err) {
      setError(err.message);
      console.error(err);
      setLoading(false);
      return;
    }
    setSuccess(true);
  }

  if (success)
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">✓</span>
        </div>
        <h3 className="font-display font-semibold text-slate-900">
          Cek Email Anda
        </h3>
        <p className="text-sm text-slate-500">
          Kami mengirimkan link konfirmasi ke <strong>{form.email}</strong>
        </p>
        <Link href="/login" className="btn-primary w-full block text-center">
          Ke Halaman Masuk
        </Link>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Nama Lengkap
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className="input-base"
          placeholder="Nama lengkap"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="input-base"
          placeholder="nama@email.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="input-base pr-10"
            placeholder="Min. 8 karakter"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Konfirmasi Password
        </label>
        <input
          type="password"
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
          className="input-base"
          placeholder="Ulangi password"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Mendaftar...
          </>
        ) : (
          "Daftar Sekarang"
        )}
      </button>
      <p className="text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}
