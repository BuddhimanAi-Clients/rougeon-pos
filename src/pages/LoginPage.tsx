import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'
import type { UserRole } from '../types/pos'

export function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const role = (session?.user as { role?: UserRole } | undefined)?.role
  if (!sessionPending && session && (role === 'cashier' || role === 'admin')) return <Navigate to="/sale" replace />
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError('')
    const result = await authClient.signIn.email({ email: form.email.trim(), password: form.password })
    if (result.error) { setError(result.error.message ?? 'Sign in failed'); setPending(false); return }
    const nextRole = (result.data?.user as { role?: UserRole } | undefined)?.role
    if (nextRole !== 'cashier' && nextRole !== 'admin') { await authClient.signOut(); setError('This account is not allowed to operate POS.'); setPending(false); return }
    navigate('/sale')
  }
  return <main className="pos-login"><section className="login-brand"><div className="login-grid" /><p><i className="brand-star" aria-hidden="true" />ROGUEON / RETAIL SYSTEM</p><h1>SELL FAST.<br />STAY IN SYNC.</h1><span>Shared inventory / offline queue / immutable receipts</span></section><section className="login-form-panel"><form onSubmit={submit}><div className="terminal-mark"><LockKeyhole /><span>STAFF TERMINAL</span></div><h2>SHIFT ACCESS</h2><p>Use your staff email and password.</p><label><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Password</span><div className="pos-password"><input type={show ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff /> : <Eye />}</button></div></label>{error && <div className="login-error">{error}</div>}<button className="pos-primary-button" disabled={pending}>{pending ? 'Opening terminal…' : 'Open terminal'} <ArrowRight /></button><small>Cashier and Admin roles are accepted. Customer accounts are denied.</small></form></section></main>
}
