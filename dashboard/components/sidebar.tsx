'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: '◉' },
  { href: '/wallets', label: 'Wallets', icon: '◈' },
  { href: '/social', label: 'Social Feed', icon: '◇' },
  { href: '/drafts', label: 'Drafts Queue', icon: '◆' },
  { href: '/linkedin', label: 'LinkedIn', icon: '◎' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-osr-surface border-r border-osr-border flex flex-col">
      <div className="p-4 border-b border-osr-border">
        <div className="text-osr-green font-bold text-sm tracking-wider">OSR OPS</div>
        <div className="text-osr-text-dim text-xs mt-1">Agent Command Center</div>
      </div>

      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-osr-green/10 text-osr-green border-r-2 border-osr-green'
                  : 'text-osr-text-muted hover:text-white hover:bg-osr-card-hover'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-osr-border">
        <div className="text-osr-text-dim text-xs">
          <a href="/api/auth?action=logout" className="hover:text-osr-green transition-colors">
            Logout
          </a>
        </div>
      </div>
    </aside>
  )
}
