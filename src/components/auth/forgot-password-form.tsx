"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent)
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-2xl">
          📧
        </div>
        <h3 className="font-semibold text-slate-900">Email Terkirim!</h3>
        <p className="text-sm text-slate-500">
          Cek inbox <strong>{email}</strong> untuk link reset password.
        </p>
        <Link
          href="/login"
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          Kembali ke Login
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
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="nama@email.com"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Mengirim...
          </>
        ) : (
          "Kirim Link Reset"
        )}
      </button>
      <Link
        href="/login"
        className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} />
        Kembali ke Login
      </Link>
    </form>
  );
}
