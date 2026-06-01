import Image from 'next/image';
import { STT_TGD_LOGO } from '../../../public';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0">
        {/* Main Gradient */}
        <div className="absolute inset-0 bg-white" />

        {/* Decorative Orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/20 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-lotus-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-blossom-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(to right, blue 1px, transparent 1px),
              linear-gradient(to bottom, blue 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 ">
            <Image src={STT_TGD_LOGO.src} alt="Logo" className="object-contain" width={100} height={100} />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-700">STT. Tunas Guna Dharma</h1>
          <p className="text-brand-700 text-sm mt-1">Sistem Manajemen Organisasi</p>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl shadow-brand-900/40 p-8">{children}</div>
      </div>
    </div>
  );
}

// import Image from 'next/image';
// import { STT_TGD_LOGO } from '../../../public';

// export default function AuthLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center px-4">
//       {/* Background */}
//       <div className="absolute inset-0">
//         {/* Main Gradient */}
//         <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800" />

//         {/* Decorative Orbs */}
//         <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/20 blur-3xl rounded-full" />
//         <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-lotus-500/20 blur-3xl rounded-full" />
//         <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-blossom-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />

//         {/* Grid Pattern */}
//         <div
//           className="absolute inset-0 opacity-[0.04]"
//           style={{
//             backgroundImage: `
//               linear-gradient(to right, white 1px, transparent 1px),
//               linear-gradient(to bottom, white 1px, transparent 1px)
//             `,
//             backgroundSize: '40px 40px',
//           }}
//         />
//       </div>

//       <div className="relative z-10 w-full max-w-md">
//         {/* Logo Section */}
//         <div className="text-center mb-8">
//           <div className="relative inline-flex">
//             {/* Glow */}
//             <div className="absolute inset-0 bg-brand-400/30 blur-2xl rounded-full" />

//             <div className="relative backdrop-blur-md bg-white/10 border border-white/20 rounded-full p-3">
//               <Image src={STT_TGD_LOGO.src} alt="Logo" width={110} height={110} className="object-contain" />
//             </div>
//           </div>

//           <h1 className="mt-6 font-display text-xl lg:text-3xl font-bold text-white tracking-tight">
//             STT. Tunas Guna Dharma
//           </h1>

//           <p className="mt-2 text-brand-100/80">Sistem Manajemen Organisasi</p>
//         </div>

//         <div className="bg-white rounded-3xl shadow-2xl shadow-brand-900/40 p-8">{children}</div>
//       </div>
//     </div>
//   );
// }
