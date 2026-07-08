'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Package, BookOpen, Users, Tag, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
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
}

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ totalPackages: 0, totalBookings: 0, todayBookings: 0, totalCustomers: 0, pendingBookings: 0, confirmedBookings: 0, activeOffers: 0, totalRevenue: 0 })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const today = new Date().toISOString().split('T')[0]
    const [pkgs, bookings, customers, offers] = await Promise.all([
      supabase.from('packages').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role_name', 'customer'),
      supabase.from('offers').select('id', { count: 'exact', head: true }).eq('is_active', true),
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
    })
    setRecentBookings(bks.slice(0, 8))

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
    { label: 'Tour Packages', value: stats.totalPackages, icon: Package, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: BookOpen, color: '#8b5cf6', bg: '#ede9fe' },
    { label: "Today's Bookings", value: stats.todayBookings, icon: Clock, color: '#f97316', bg: '#ffedd5' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: '#10b981', bg: '#d1fae5' },
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Confirmed', value: stats.confirmedBookings, icon: CheckCircle, color: '#059669', bg: '#d1fae5' },
    { label: 'Active Offers', value: stats.activeOffers, icon: Tag, color: '#ec4899', bg: '#fce7f3' },
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
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{ padding: '1.25rem' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{card.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{card.label}</p>
          </div>
        ))}
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

        {/* Recent Bookings */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>Recent Bookings</h2>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '280px' }}>
            <table>
              <thead><tr><th>Customer</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b.id}>
                    <td><p className="font-medium text-sm">{b.customer_name}</p><p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{b.booking_number}</p></td>
                    <td className="text-xs capitalize">{(b.booking_type || '').replace(/_/g, ' ')}</td>
                    <td>{statusBadge(b.status)}</td>
                  </tr>
                ))}
                {!recentBookings.length && <tr><td colSpan={3} className="text-center py-8" style={{ color: 'var(--muted-foreground)' }}>No bookings yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
