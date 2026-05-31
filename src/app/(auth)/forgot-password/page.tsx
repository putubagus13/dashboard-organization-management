import { Metadata } from 'next';
import ForgotPasswordForm from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Lupa Password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Lupa Password</h2>
      <p className="text-slate-500 text-sm mb-6">Masukkan email untuk reset password</p>
      <ForgotPasswordForm />
    </>
  );
}
