'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, Package, Tag, Bell, MessageSquare, BookOpen,
  Users, Settings, Image, Search, LogOut, Menu, X, Sun, Moon,
  ChevronDown, ExternalLink, BarChart2, Megaphone, DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/packages', icon: Package, label: 'Tour Packages' },
  { href: '/dashboard/pricing', icon: DollarSign, label: 'Price Management' },
  { href: '/dashboard/bookings', icon: BookOpen, label: 'Bookings' },
  { href: '/dashboard/customers', icon: Users, label: 'Customers' },
  { href: '/dashboard/offers', icon: Tag, label: 'Offers' },
  { href: '/dashboard/popups', icon: MessageSquare, label: 'Popup Builder' },
  { href: '/dashboard/notification-bar', icon: Bell, label: 'Notification Bar' },
  { href: '/dashboard/announcements', icon: Megaphone, label: 'Announcements' },
  { href: '/dashboard/gallery', icon: Image, label: 'Image Gallery' },
  { href: '/dashboard/settings', icon: Settings, label: 'Website Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin', email: user.email || '' })
    })
    const savedDark = localStorage.getItem('admin-dark') === 'true'
    setDark(savedDark)
    if (savedDark) document.documentElement.classList.add('dark')
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('admin-dark', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )} style={{ width: '260px', background: 'var(--card)', borderRight: '1px solid var(--border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">S</div>
          <div className="min-w-0">
            <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Saanvi Royal</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Admin Panel</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn('sidebar-link', pathname === href && 'active')}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <a href={process.env.NEXT_PUBLIC_MAIN_SITE_URL} target="_blank" rel="noreferrer"
            className="sidebar-link mb-1">
            <ExternalLink size={16} /> View Website
          </a>
          <button onClick={logout} className="sidebar-link w-full text-red-500 hover:bg-red-50">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: '0', paddingLeft: '0' }}>
        <div className="lg:ml-[260px]">
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-6 py-3 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}>
              <Menu size={20} />
            </button>

            {/* Page title */}
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                {navItems.find(n => n.href === pathname)?.label || 'Dashboard'}
              </p>
            </div>

            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-muted transition" style={{ color: 'var(--muted-foreground)' }}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User avatar */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Admin</p>
                </div>
              </div>
            )}
          </header>

          {/* Content */}
          <main className="p-4 md:p-6 fade-in">{children}</main>
        </div>
      </div>
    </div>
  )
}
