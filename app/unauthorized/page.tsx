import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldX size={40} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Access Denied</h1>
        <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>You don't have permission to access the admin panel.</p>
        <Link href="/login" className="btn-primary">Back to Login</Link>
      </div>
    </div>
  )
}
