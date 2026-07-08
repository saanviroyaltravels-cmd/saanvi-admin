'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Search, Edit, Trash2, Copy, Eye, ToggleLeft, ToggleRight, Star } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default function PackagesPage() {
  const supabase = createClient()
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => { loadPackages() }, [])

  async function loadPackages() {
    const { data } = await supabase.from('packages').select('*').order('created_at', { ascending: false })
    setPackages(data || [])
    setLoading(false)
  }

  async function deletePackage(id: number) {
    if (!confirm('Delete this package?')) return
    await supabase.from('packages').delete().eq('id', id)
    toast.success('Package deleted')
    loadPackages()
  }

  async function togglePublish(pkg: any) {
    await supabase.from('packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    toast.success(pkg.is_active ? 'Package unpublished' : 'Package published')
    loadPackages()
  }

  async function toggleFeatured(pkg: any) {
    await supabase.from('packages').update({ featured: !pkg.featured }).eq('id', pkg.id)
    toast.success('Updated')
    loadPackages()
  }

  async function duplicatePackage(pkg: any) {
    const { id, created_at, updated_at, ...rest } = pkg
    const { error } = await supabase.from('packages').insert({ ...rest, title: rest.title + ' (Copy)', is_active: false })
    if (error) toast.error(error.message)
    else { toast.success('Package duplicated'); loadPackages() }
  }

  const filtered = packages.filter(p => {
    const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) || p.dest?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.is_active : !p.is_active)
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Tour Packages</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{packages.length} packages total</p>
        </div>
        <Link href="/dashboard/packages/new" className="btn-primary">
          <Plus size={16} /> Add Package
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
          <input placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Destination</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(pkg => (
                  <tr key={pkg.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {pkg.image ? <img src={pkg.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">🏛️</div>}
                        </div>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-1">
                            {pkg.title}
                            {pkg.featured && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{pkg.booking_number || `PKG-${pkg.id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{pkg.dest || pkg.destination}</td>
                    <td>
                      <p className="font-semibold text-sm">{formatCurrency(pkg.price || 0)}</p>
                      {pkg.discount_price && <p className="text-xs line-through" style={{ color: 'var(--muted-foreground)' }}>{formatCurrency(pkg.discount_price)}</p>}
                    </td>
                    <td className="text-sm">{pkg.duration || '—'}</td>
                    <td>
                      <span className={`badge ${pkg.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/packages/${pkg.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><Edit size={15} /></Link>
                        <button onClick={() => togglePublish(pkg)} className="p-1.5 rounded-lg hover:bg-slate-100" title={pkg.is_active ? 'Unpublish' : 'Publish'} style={{ color: 'var(--muted-foreground)' }}>
                          {pkg.is_active ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
                        </button>
                        <button onClick={() => toggleFeatured(pkg)} className="p-1.5 rounded-lg hover:bg-yellow-50" title="Toggle featured">
                          <Star size={15} className={pkg.featured ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'} />
                        </button>
                        <button onClick={() => duplicatePackage(pkg)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Duplicate" style={{ color: 'var(--muted-foreground)' }}><Copy size={15} /></button>
                        <button onClick={() => deletePackage(pkg.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No packages found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
