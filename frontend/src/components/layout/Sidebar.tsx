'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Live Rooms', href: '/', icon: HomeIcon },
  { name: 'Moderation', href: '/moderation', icon: ShieldCheckIcon },
  { name: 'Policies', href: '/policies', icon: Cog6ToothIcon },
  { name: 'Audit Log', href: '/audit', icon: ClipboardDocumentListIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <ShieldCheckIcon className="h-8 w-8 text-primary-500" />
        <span className="ml-3 text-lg font-semibold">LiveKit Moderation</span>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          AI Safety Console v0.1.0
        </p>
      </div>
    </aside>
  );
}
