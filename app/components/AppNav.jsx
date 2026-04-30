'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '▦', label: 'Dashboard', exact: true },
  { href: '/catalogs', icon: '▤', label: 'Catalogs' },
  { href: '/modules', icon: '◈', label: 'Modules' },
  { href: '/industries', icon: '◎', label: 'Industries' },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, icon, label, exact }) => {
        const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={isActive ? 'app-nav-link app-nav-link--active' : 'app-nav-link'}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="app-nav-icon" aria-hidden="true">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
