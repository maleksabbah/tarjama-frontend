'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { href: '/upload', label: 'Upload', icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { href: '/jobs', label: 'Jobs', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },
  { href: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="w-[220px] bg-surface-card border-r border-line flex flex-col p-5 shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-7 cursor-pointer" onClick={() => router.push('/dashboard')}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-brand-500">
          <rect x="2" y="10" width="3" height="12" rx="1.5" fill="currentColor" opacity="0.6">
            <animate attributeName="height" values="12;20;12" dur="1s" repeatCount="indefinite" />
            <animate attributeName="y" values="10;6;10" dur="1s" repeatCount="indefinite" />
          </rect>
          <rect x="8" y="6" width="3" height="20" rx="1.5" fill="currentColor" opacity="0.8">
            <animate attributeName="height" values="20;8;20" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="y" values="6;12;6" dur="1.2s" repeatCount="indefinite" />
          </rect>
          <rect x="14" y="4" width="3" height="24" rx="1.5" fill="currentColor">
            <animate attributeName="height" values="24;14;24" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="y" values="4;9;4" dur="0.8s" repeatCount="indefinite" />
          </rect>
          <rect x="20" y="8" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.8">
            <animate attributeName="height" values="16;24;16" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="y" values="8;4;8" dur="1.1s" repeatCount="indefinite" />
          </rect>
          <rect x="26" y="11" width="3" height="10" rx="1.5" fill="currentColor" opacity="0.6">
            <animate attributeName="height" values="10;18;10" dur="0.9s" repeatCount="indefinite" />
            <animate attributeName="y" values="11;7;11" dur="0.9s" repeatCount="indefinite" />
          </rect>
        </svg>
        <span className="text-lg font-bold gradient-text">Tarjama</span>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all text-left
                ${active
                  ? 'bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold'
                  : 'border border-transparent text-muted hover:bg-surface-hover'
                }`}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-dim hover:text-red-400 hover:bg-red-500/5 transition-all"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Logout
      </button>
    </div>
  );
}
