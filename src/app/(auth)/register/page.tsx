import { Metadata } from 'next';
import RegisterForm from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Daftar Akun' };

export default function RegisterPage() {
  return (
    <>
      <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Buat Akun</h2>
      <p className="text-slate-500 text-sm mb-6">Daftarkan akun baru untuk organisasi</p>
      <RegisterForm />
    </>
  );
}
