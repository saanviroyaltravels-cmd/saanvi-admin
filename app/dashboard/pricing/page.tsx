'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TrendingDown, TrendingUp, Save, History } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function PricingPage() {
  const supabase = createClient()
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<number, { price: string; discount_price: string }>>({})
  const [history, setHistory] = useState<any[]>([])
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [pkgs, hist] = await Promise.all([
      supabase.from('packages').select('id, title, destination_name, price, discount_price, is_active').order('title'),
      supabase.from('price_history').select('*').order('changed_at', { ascending: false }).limit(20)
    ])
    setPackages(pkgs.data || [])
    const init: any = {}
    pkgs.data?.forEach(p => { init[p.id] = { price: String(p.price || ''), discount_price: String(p.discount_price || '') } })
    setPrices(init)
    setHistory(hist.data || [])
    setLoading(false)
  }

  async function updatePrice(pkg: any) {
    setSaving(pkg.id)
    const newPrice = Number(prices[pkg.id]?.price)
    const newDiscount = prices[pkg.id]?.discount_price ? Number(prices[pkg.id].discount_price) : null
    const { error } = await supabase.from('packages').update({ price: newPrice, discount_price: newDiscount }).eq('id', pkg.id)
    if (error) { toast.error(error.message); setSaving(null); return }

    // Log price history
    await supabase.from('price_history').insert({ package_id: pkg.id, package_name: pkg.title, old_price: pkg.price, new_price: newPrice, changed_at: new Date().toISOString() })

    toast.success(`Price updated for ${pkg.title}`)
    setSaving(null)
    loadData()
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full spinner" /></div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Price Management</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Update prices instantly — changes appear live on website</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Price Editor */}
        <div className="lg:col-span-2 space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="card" style={{ padding: '1rem' }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{pkg.title}</p>
                    <span className={`badge ${pkg.is_active ? 'badge-green' : 'badge-gray'}`}>{pkg.is_active ? 'Live' : 'Draft'}</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>{pkg.destination_name}</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label>Current Price (₹)</label>
                      <input type="number" value={prices[pkg.id]?.price || ''} onChange={e => setPrices(p => ({ ...p, [pkg.id]: { ...p[pkg.id], price: e.target.value } }))} style={{ width: '140px' }} />
                    </div>
                    <div>
                      <label>Discount/Strike Price (₹)</label>
                      <input type="number" value={prices[pkg.id]?.discount_price || ''} onChange={e => setPrices(p => ({ ...p, [pkg.id]: { ...p[pkg.id], discount_price: e.target.value } }))} style={{ width: '140px' }} placeholder="Optional" />
                    </div>
                    <button onClick={() => updatePrice(pkg)} disabled={saving === pkg.id} className="btn-primary" style={{ marginBottom: '0' }}>
                      {saving === pkg.id ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" /> : <Save size={14} />}
                      {saving === pkg.id ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                  {/* Price diff indicator */}
                  {prices[pkg.id]?.price && Number(prices[pkg.id].price) !== pkg.price && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Old: {formatCurrency(pkg.price)}</span>
                      <span>→</span>
                      <span className="text-xs font-bold" style={{ color: Number(prices[pkg.id].price) < pkg.price ? '#059669' : '#dc2626' }}>
                        {Number(prices[pkg.id].price) < pkg.price ? <TrendingDown size={12} style={{ display: 'inline' }} /> : <TrendingUp size={12} style={{ display: 'inline' }} />}
                        {' '}{formatCurrency(Number(prices[pkg.id].price))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Price History */}
        <div className="card" style={{ padding: 0 }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <History size={15} style={{ color: 'var(--muted-foreground)' }} />
            <h2 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>Price History</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {history.map(h => (
              <div key={h.id} className="px-4 py-3">
                <p className="font-medium text-xs" style={{ color: 'var(--foreground)' }}>{h.package_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs line-through" style={{ color: 'var(--muted-foreground)' }}>₹{h.old_price?.toLocaleString()}</span>
                  <span className="text-xs">→</span>
                  <span className="text-xs font-bold" style={{ color: h.new_price < h.old_price ? '#059669' : '#dc2626' }}>₹{h.new_price?.toLocaleString()}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{new Date(h.changed_at).toLocaleDateString('en-IN')}</p>
              </div>
            ))}
            {!history.length && <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>No price changes yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
