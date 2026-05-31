import { Metadata } from 'next';
import LoginForm from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Masuk' };

export default function LoginPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Selamat Datang</h2>
      <p className="text-slate-500 text-sm mb-6">Masuk ke akun organisasi Anda</p>
      <LoginForm />
    </>
  );
}
