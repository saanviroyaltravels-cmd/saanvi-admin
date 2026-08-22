'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, BookOpen, Users, Tag, TrendingUp, Clock, CheckCircle, AlertCircle, Inbox, MessageSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Stats {
  totalPackages: number
  totalBookings: number
  todayBookings: number
  totalCustomers: number
  pendingBookings: number
  confirmedBookings: number
  activeOffers: number
  totalRevenue: number
  newInquiries: number
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ totalPackages: 0, totalBookings: 0, todayBookings: 0, totalCustomers: 0, pendingBookings: 0, confirmedBookings: 0, activeOffers: 0, totalRevenue: 0, newInquiries: 0 })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recentInquiries, setRecentInquiries] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const today = new Date().toISOString().split('T')[0]
    const [pkgs, bookings, customers, offers, inquiriesRes, recentInqRes] = await Promise.all([
      supabase.from('packages').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role_name', 'customer'),
      supabase.from('offers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }).limit(5)
    ])
    const bks = bookings.data || []
    const todayBks = bks.filter(b => b.created_at?.startsWith(today))
    const revenue = bks.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (b.total_amount || b.fare || 0), 0)
    setStats({
      totalPackages: pkgs.count || 0, totalBookings: bks.length,
      todayBookings: todayBks.length, totalCustomers: customers.count || 0,
      pendingBookings: bks.filter(b => b.status === 'Pending').length,
      confirmedBookings: bks.filter(b => b.status === 'Confirmed').length,
      activeOffers: offers.count || 0, totalRevenue: revenue,
      newInquiries: inquiriesRes.count || 0
    })
    setRecentBookings(bks.slice(0, 8))
    setRecentInquiries(recentInqRes.data || [])

    // Chart: last 7 days bookings
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().split('T')[0]
      return { date: d.toLocaleDateString('en-IN', { weekday: 'short' }), bookings: bks.filter(b => b.created_at?.startsWith(key)).length }
    })
    setChartData(days)
    setLoading(false)
  }

  const statCards = [
    { label: 'New Inquiries', value: stats.newInquiries, icon: Inbox, color: '#f59e0b', bg: '#fef3c7', href: '/dashboard/inquiries', alert: stats.newInquiries > 0 },
    { label: 'Total Bookings', value: stats.totalBookings, icon: BookOpen, color: '#8b5cf6', bg: '#ede9fe', href: '/dashboard/bookings' },
    { label: "Today's Bookings", value: stats.todayBookings, icon: Clock, color: '#f97316', bg: '#ffedd5' },
    { label: 'Tour Packages', value: stats.totalPackages, icon: Package, color: '#3b82f6', bg: '#dbeafe', href: '/dashboard/packages' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: '#10b981', bg: '#d1fae5', href: '/dashboard/customers' },
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: AlertCircle, color: '#ef4444', bg: '#fee2e2', href: '/dashboard/bookings' },
    { label: 'Active Offers', value: stats.activeOffers, icon: Tag, color: '#ec4899', bg: '#fce7f3', href: '/dashboard/offers' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: '#1e40af', bg: '#dbeafe', currency: true },
  ]

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { Pending: 'badge-yellow', Confirmed: 'badge-blue', Completed: 'badge-green', Cancelled: 'badge-red' }
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Content = (
            <div className={`card transition hover:scale-[1.01] ${card.alert ? 'border-amber-400 dark:border-amber-500/50' : ''}`} style={{ padding: '1.25rem' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                {card.alert && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{card.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{card.label}</p>
            </div>
          )

          return card.href ? (
            <Link key={card.label} href={card.href} className="block no-underline">
              {Content}
            </Link>
          ) : (
            <div key={card.label}>{Content}</div>
          )
        })}
      </div>

      {/* Chart + Recent */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="card">
          <h2 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>Bookings — Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Inquiries Quick Widget */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Latest Customer Inquiries</h2>
            <Link href="/dashboard/inquiries" className="text-xs text-blue-600 hover:underline font-semibold">
              View All
            </Link>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '280px' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recentInquiries.map(inq => (
                <div key={inq.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{inq.name || 'Customer'}</p>
                      {inq.status === 'open' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">New</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{inq.message || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={`tel:${inq.mobile}`} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold" title="Call">
                      📞
                    </a>
                    <a href={`https://wa.me/91${inq.mobile}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-green-50 text-green-600 dark:bg-green-950/60 dark:text-green-400 hover:bg-green-100 text-xs font-semibold" title="WhatsApp">
                      💬
                    </a>
                  </div>
                </div>
              ))}
              {!recentInquiries.length && (
                <p className="text-center py-8 text-xs" style={{ color: 'var(--muted-foreground)' }}>No inquiries received yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

