import { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Reset Password' };

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Reset Password</h2>
      <p className="text-slate-500 text-sm mb-6">Masukkan password baru Anda</p>
      <ResetPasswordForm />
    </>
  );
}
