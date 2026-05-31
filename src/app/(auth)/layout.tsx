export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-forest-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
            <span className="text-2xl font-display font-bold text-white">STT</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Tunas Guna Dharma</h1>
          <p className="text-brand-200 text-sm mt-1">Sistem Manajemen Organisasi</p>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl shadow-brand-900/40 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
