'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Download, Filter } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUSES = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled']

export default function BookingsPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadBookings() }, [])

  async function loadBookings() {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('bookings').update({ status: newStatus }).eq('booking_number', id)
    toast.success('Status updated')
    loadBookings()
    setSelected((prev: any) => prev ? { ...prev, status: newStatus } : null)
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = b.booking_number?.toLowerCase().includes(q) || b.customer_name?.toLowerCase().includes(q) || b.customer_mobile?.includes(q)
    const matchStatus = status === 'All' || b.status === status
    return matchSearch && matchStatus
  })

  function exportCSV() {
    const headers = ['Booking No', 'Customer', 'Mobile', 'Type', 'Destination', 'Date', 'Status', 'Amount']
    const rows = filtered.map(b => [b.booking_number, b.customer_name, b.customer_mobile, b.booking_type, b.destination, b.travel_date, b.status, b.total_amount || b.fare || 0])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'bookings.csv'; a.click()
    toast.success('Exported as CSV')
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { Pending: 'badge-yellow', Confirmed: 'badge-blue', Completed: 'badge-green', Cancelled: 'badge-red' }
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Booking Management</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{bookings.length} total bookings</p>
        </div>
        <button onClick={exportCSV} className="btn-ghost"><Download size={15} /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input placeholder="Search by name, mobile, booking ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition"
              style={{ background: status === s ? 'var(--primary)' : 'var(--muted)', color: status === s ? 'white' : 'var(--muted-foreground)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Bookings Table */}
        <div className="lg:col-span-2 card overflow-hidden" style={{ padding: 0 }}>
          {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> : (
            <div className="overflow-x-auto">
              <table>
                <thead><tr><th>Booking</th><th>Customer</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id} onClick={() => setSelected(b)} className="cursor-pointer" style={{ background: selected?.id === b.id ? 'var(--muted)' : '' }}>
                      <td>
                        <p className="font-mono text-xs font-bold text-blue-600">{b.booking_number}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{(b.booking_type || '').replace(/_/g, ' ')}</p>
                      </td>
                      <td>
                        <p className="font-medium text-sm">{b.customer_name}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{b.customer_mobile}</p>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{b.travel_date || formatDate(b.created_at)}</td>
                      <td>{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={4} className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No bookings found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="card">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>Booking Details</h3>
                <button onClick={() => setSelected(null)} className="text-xs" style={{ color: 'var(--muted-foreground)' }}>✕ Close</button>
              </div>
              <div className="space-y-2 text-sm">
                {[['ID', selected.booking_number], ['Customer', selected.customer_name], ['Mobile', selected.customer_mobile], ['Email', selected.customer_email || '—'], ['Type', selected.booking_type], ['Destination', selected.destination || '—'], ['Travel Date', selected.travel_date || '—'], ['Pickup', selected.pickup_address || '—'], ['Amount', formatCurrency(selected.total_amount || selected.fare || 0)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span style={{ color: 'var(--muted-foreground)' }}>{k}</span>
                    <span className="font-medium text-right" style={{ color: 'var(--foreground)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <label>Update Status</label>
                <select value={selected.status} onChange={e => updateStatus(selected.booking_number, e.target.value)}>
                  {['Pending', 'Confirmed', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/91${selected.customer_mobile}`} target="_blank" rel="noreferrer"
                  className="btn-primary flex-1 justify-center text-xs" style={{ background: '#25d366' }}>
                  💬 WhatsApp
                </a>
                <a href={`tel:${selected.customer_mobile}`} className="btn-ghost flex-1 justify-center text-xs">📞 Call</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center" style={{ color: 'var(--muted-foreground)' }}>
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">Click a booking to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
