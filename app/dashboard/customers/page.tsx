'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Phone, Mail, MessageCircle, Trash2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

export default function CustomersPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bookingsMap, setBookingsMap] = useState<Record<string, any[]>>({})

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data } = await supabase.from('profiles').select('*').eq('role_name', 'customer').order('created_at', { ascending: false })
    setCustomers(data || [])
    setLoading(false)
  }

  async function loadBookings(email: string) {
    if (bookingsMap[email]) return
    const { data } = await supabase.from('bookings').select('*').eq('customer_email', email).order('created_at', { ascending: false })
    setBookingsMap(prev => ({ ...prev, [email]: data || [] }))
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer profile?')) return
    await supabase.from('profiles').delete().eq('id', id)
    toast.success('Customer deleted')
    loadCustomers()
  }

  const toggleExpand = async (email: string) => {
    if (expanded === email) { setExpanded(null); return }
    setExpanded(email)
    await loadBookings(email)
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.mobile?.includes(q)
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Customer Management</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{customers.length} registered customers</p>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
        <input placeholder="Search by name, email, mobile..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div> :
          filtered.map(c => (
            <div key={c.id} className="card" style={{ padding: '1rem' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(c.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{c.name || 'Unknown'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.email}</p>
                  {c.mobile && <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.mobile}</p>}
                </div>
                <span className={`badge ${c.login_provider === 'google' ? 'badge-blue' : 'badge-gray'}`}>{c.login_provider || 'email'}</span>
                <div className="flex items-center gap-1">
                  {c.mobile && <>
                    <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-green-50" title="WhatsApp"><MessageCircle size={15} className="text-green-600" /></a>
                    <a href={`tel:${c.mobile}`} className="p-1.5 rounded-lg hover:bg-blue-50" title="Call"><Phone size={15} className="text-blue-600" /></a>
                  </>}
                  {c.email && <a href={`mailto:${c.email}`} className="p-1.5 rounded-lg hover:bg-slate-100" title="Email"><Mail size={15} style={{ color: 'var(--muted-foreground)' }} /></a>}
                  <button onClick={() => toggleExpand(c.email)} className="p-1.5 rounded-lg hover:bg-slate-100" title="View bookings">
                    <ChevronDown size={15} style={{ color: 'var(--muted-foreground)', transform: expanded === c.email ? 'rotate(180deg)' : '', transition: '0.2s' }} />
                  </button>
                  <button onClick={() => deleteCustomer(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Booking History */}
              {expanded === c.email && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted-foreground)' }}>BOOKING HISTORY</p>
                  {(bookingsMap[c.email] || []).length > 0 ? (
                    <div className="space-y-2">
                      {(bookingsMap[c.email] || []).map(b => (
                        <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--muted)' }}>
                          <div>
                            <p className="font-mono text-xs font-bold text-blue-600">{b.booking_number}</p>
                            <p className="text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{(b.booking_type || '').replace(/_/g, ' ')} · {b.destination || b.package_name || '—'}</p>
                          </div>
                          <span className={`badge ${b.status === 'Pending' ? 'badge-yellow' : b.status === 'Confirmed' ? 'badge-blue' : b.status === 'Completed' ? 'badge-green' : 'badge-red'}`}>{b.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No bookings yet</p>}
                </div>
              )}
            </div>
          ))}
        {!loading && !filtered.length && <div className="card text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No customers found</div>}
      </div>
    </div>
  )
}
