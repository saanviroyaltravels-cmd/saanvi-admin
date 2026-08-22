'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Phone, MessageCircle, Mail, Trash2, CheckCircle2,
  Clock, RefreshCw, Filter, AlertCircle, ChevronDown, Check, X,
  Inbox, Calendar, User, MessageSquare, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface Inquiry {
  id: string
  name: string
  mobile: string
  email: string | null
  subject: string | null
  message: string
  type: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | string
  priority: string | null
  replied: boolean
  created_at: string
  updated_at: string
}

export default function InquiriesPage() {
  const supabase = createClient()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string; message: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadInquiries()
  }, [])

  async function loadInquiries(isManual = false) {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInquiries(data || [])
      if (isManual) toast.success('Inquiries refreshed')
    } catch (err: any) {
      console.error('Error loading inquiries:', err)
      toast.error('Failed to load inquiries: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id)
    try {
      const isReplied = newStatus === 'resolved' || newStatus === 'closed'
      const { data, error } = await supabase
        .from('enquiries')
        .update({
          status: newStatus,
          replied: isReplied,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('Status update नहीं हो सका। RLS permission check करें।')
      }

      setInquiries(prev => prev.map(item =>
        item.id === id ? { ...item, status: newStatus, replied: isReplied } : item
      ))

      const statusLabels: Record<string, string> = {
        open: 'Marked as New',
        in_progress: 'Marked as Read / In Progress',
        resolved: 'Marked as Replied',
        closed: 'Marked as Closed'
      }

      toast.success(statusLabels[newStatus] || 'Status updated successfully')
    } catch (err: any) {
      console.error('Error updating inquiry status:', err)
      toast.error('Failed to update status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteModal) return
    setIsDeleting(true)

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .delete()
        .eq('id', deleteModal.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('0 rows deleted in database. Supabase RLS policy might be missing DELETE permission.')
      }

      // ONLY remove from UI when database deletion is confirmed
      setInquiries(prev => prev.filter(item => item.id !== deleteModal.id))
      toast.success('Enquiry permanently deleted.')
      setDeleteModal(null)
    } catch (err: any) {
      console.error('Error permanently deleting inquiry:', err)
      toast.error('Enquiry delete नहीं हो सकी। कृपया दोबारा कोशिश करें। (' + (err.message || '') + ')')
    } finally {
      setIsDeleting(false)
    }
  }

  // Formatting helpers
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return ''
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // Counts
  const counts = {
    all: inquiries.length,
    open: inquiries.filter(i => i.status === 'open' || !i.status).length,
    in_progress: inquiries.filter(i => i.status === 'in_progress').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
    closed: inquiries.filter(i => i.status === 'closed').length
  }

  // Filtered List
  const filtered = inquiries.filter(i => {
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'open' ? (i.status === 'open' || !i.status) : i.status === statusFilter)
    const q = search.toLowerCase().trim()
    const matchesSearch = !q ||
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.mobile && i.mobile.includes(q)) ||
      (i.email && i.email.toLowerCase().includes(q)) ||
      (i.message && i.message.toLowerCase().includes(q))
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
      default:
        return (
          <span className="badge badge-yellow flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            New / नया
          </span>
        )
      case 'in_progress':
        return (
          <span className="badge badge-blue flex items-center gap-1.5 font-bold">
            <Clock size={12} />
            Read / प्रक्रिया में
          </span>
        )
      case 'resolved':
        return (
          <span className="badge badge-green flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={12} />
            Replied / उत्तर दिया
          </span>
        )
      case 'closed':
        return (
          <span className="badge badge-gray flex items-center gap-1.5">
            Closed / बंद
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Customer Enquiries
            </h1>
            {counts.open > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {counts.open} New
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Website Contact Form से आए संदेश और पूछताछ का प्रबंधन करें।
          </p>
        </div>

        <button
          onClick={() => loadInquiries(true)}
          disabled={refreshing || loading}
          className="btn-ghost flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`card cursor-pointer transition hover:scale-[1.01] ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          style={{ padding: '1rem' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>All Enquiries</span>
            <Inbox size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{counts.all}</p>
        </div>

        <div
          onClick={() => setStatusFilter('open')}
          className={`card cursor-pointer transition hover:scale-[1.01] ${statusFilter === 'open' ? 'ring-2 ring-amber-500' : ''}`}
          style={{ padding: '1rem', background: counts.open > 0 ? 'var(--muted)' : undefined }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">New / Unread</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.open}</p>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`card cursor-pointer transition hover:scale-[1.01] ${statusFilter === 'resolved' ? 'ring-2 ring-emerald-500' : ''}`}
          style={{ padding: '1rem' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Replied</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.resolved}</p>
        </div>

        <div
          onClick={() => setStatusFilter('closed')}
          className={`card cursor-pointer transition hover:scale-[1.01] ${statusFilter === 'closed' ? 'ring-2 ring-slate-400' : ''}`}
          style={{ padding: '1rem' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>Closed</span>
            <Check size={16} style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{counts.closed}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search by customer name, mobile, email, message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'open', label: 'New', count: counts.open },
            { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
            { id: 'resolved', label: 'Replied', count: counts.resolved },
            { id: 'closed', label: 'Closed', count: counts.closed }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === f.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 card">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner mb-3" />
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Loading customer enquiries...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 text-2xl">
              📬
            </div>
            <h3 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
              {search || statusFilter !== 'all' ? 'No matching enquiries found' : 'No enquiries received yet'}
            </h3>
            <p className="text-xs max-w-sm mx-auto mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {search || statusFilter !== 'all'
                ? 'Try changing your search keywords or filter tab.'
                : 'Customer messages from website Contact Form will appear here automatically.'}
            </p>
          </div>
        ) : (
          filtered.map(inq => {
            const isNew = inq.status === 'open' || !inq.status
            const cleanPhone = (inq.mobile || '').replace(/\D/g, '').slice(-10)

            return (
              <div
                key={inq.id}
                className={`card transition border ${
                  isNew
                    ? 'border-amber-400/70 dark:border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
                style={{ padding: '1.25rem' }}
              >
                {/* Top Row: Customer Info + Status + Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
                      isNew ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-slate-700'
                    }`}>
                      {(inq.name || 'C')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                          {inq.name || 'Customer'}
                        </h3>
                        {getStatusBadge(inq.status)}
                      </div>
                      <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
                        <Calendar size={12} />
                        <span>{formatDateTime(inq.created_at)}</span>
                        <span className="font-semibold text-slate-400">({getRelativeTime(inq.created_at)})</span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Status Changer Dropdown & Delete Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <select
                      value={inq.status || 'open'}
                      disabled={updatingId === inq.id}
                      onChange={e => updateStatus(inq.id, e.target.value)}
                      className="text-xs font-semibold py-1 px-2.5 rounded-lg w-auto cursor-pointer"
                      style={{ height: '34px' }}
                    >
                      <option value="open">📍 New / नया</option>
                      <option value="in_progress">⏳ Read / In Progress</option>
                      <option value="resolved">✅ Replied / उत्तर दिया</option>
                      <option value="closed">🔒 Closed / बंद</option>
                    </select>

                    <button
                      onClick={() => setDeleteModal({ id: inq.id, name: inq.name || 'Customer', message: inq.message || '' })}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition"
                      title="Delete Inquiry permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Middle: Customer Message Box */}
                <div className="my-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    <MessageSquare size={13} />
                    <span>Customer Message / ग्राहक का संदेश:</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium" style={{ color: 'var(--foreground)' }}>
                    {inq.message || '(No message provided)'}
                  </p>
                </div>

                {/* Bottom: Contact Details & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Contact info snippets */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <Phone size={13} className="text-blue-500" />
                      <span>+91 {cleanPhone}</span>
                    </div>
                    {inq.email && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Mail size={13} className="text-orange-500" />
                        <span>{inq.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Call Button */}
                    <a
                      href={`tel:${cleanPhone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs"
                      title={`Call ${cleanPhone}`}
                    >
                      <Phone size={13} />
                      <span>Call</span>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${inq.name || ''}, Greetings from Saanvi Royal Travels! We received your travel enquiry regarding: "${(inq.message || '').slice(0, 80)}..." How can we help you?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-xs transition shadow-xs"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle size={13} />
                      <span>WhatsApp</span>
                    </a>

                    {/* Email Button */}
                    {inq.email && (
                      <a
                        href={`mailto:${inq.email}?subject=${encodeURIComponent('Response to your travel inquiry — Saanvi Royal Travels')}&body=${encodeURIComponent(`Dear ${inq.name || 'Customer'},\n\nThank you for contacting Saanvi Royal Travels.\n\nRegarding your enquiry: "${inq.message}"\n\n`)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
                        title="Send Email"
                      >
                        <Mail size={13} />
                        <span>Email</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="card max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/50 animate-in fade-in zoom-in duration-150"
            style={{ background: 'var(--card)' }}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
                  Delete Inquiry Permanently
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  यह पूछताछ database से हमेशा के लिए delete हो जाएगी।
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs mb-5 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                ग्राहक: <span className="font-bold">{deleteModal.name}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                "{deleteModal.message}"
              </p>
            </div>

            <p className="text-sm font-medium mb-6 text-slate-700 dark:text-slate-300">
              क्या आप इस enquiry को permanently delete करना चाहते हैं?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => !isDeleting && setDeleteModal(null)}
                disabled={isDeleting}
                className="btn-ghost px-4 py-2 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full spinner" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
