import { useEffect, useState } from 'react'
import { Cake, ChartNoAxesCombined, Cloud, CloudOff, History, LogOut, Menu, RefreshCw, ShoppingCart, Users, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { authClient } from '../lib/auth-client'
import type { UserRole } from '../types/pos'

export function RequireStaff() {
  const { data: session, isPending } = authClient.useSession()
  if (isPending) return <div className="pos-gate">Checking terminal access…</div>
  if (!session) { window.location.replace('/login'); return null }
  const role = (session.user as { role?: UserRole }).role
  if (role !== 'cashier' && role !== 'admin') return <div className="pos-gate"><strong>403</strong><h1>STAFF ACCESS ONLY.</h1><p>This account cannot operate the POS terminal.</p><button onClick={() => authClient.signOut().then(() => window.location.replace('/login'))}>Use another account</button></div>
  return <PosLayout />
}

function PosLayout() {
  const { data: session } = authClient.useSession()
  const [online, setOnline] = useState(navigator.onLine)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  const user = session?.user as { name?: string; role?: string } | undefined
  const links = <><NavLink to="/sale" onClick={() => setMenu(false)}><ShoppingCart /> New sale</NavLink><NavLink to="/dashboard" onClick={() => setMenu(false)}><ChartNoAxesCombined /> Dashboard</NavLink><NavLink to="/customers" onClick={() => setMenu(false)}><Users /> Customers</NavLink><NavLink to="/birthdays" onClick={() => setMenu(false)}><Cake /> Birthdays</NavLink><NavLink to="/history" onClick={() => setMenu(false)}><History /> History</NavLink><NavLink to="/sync" onClick={() => setMenu(false)}><RefreshCw /> Sync status</NavLink></>
  return (
    <div className="pos-shell">
      <header className="pos-topbar"><button className="pos-menu-button" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu /></button><a className="pos-logo" href="/sale"><i className="brand-star" aria-hidden="true" />ROGUEON <span>POS</span></a><nav>{links}</nav><div className={`connection-badge ${online ? 'online' : 'offline'}`}>{online ? <Cloud /> : <CloudOff />}{online ? 'Online' : 'Offline'}</div><div className="cashier-chip"><span>{user?.name?.slice(0,1).toUpperCase()}</span><p>{user?.name}<small>{user?.role}</small></p></div><button className="logout-button" type="button" aria-label="Sign out" onClick={() => authClient.signOut().then(() => window.location.replace('/login'))}><LogOut /></button></header>
      <aside className={`pos-mobile-nav ${menu ? 'open' : ''}`}><div><span className="pos-logo"><i className="brand-star" aria-hidden="true" />ROGUEON <em>POS</em></span><button onClick={() => setMenu(false)}><X /></button></div><nav>{links}</nav></aside>{menu && <button className="pos-nav-backdrop" onClick={() => setMenu(false)} aria-label="Close navigation" />}
      <Outlet />
    </div>
  )
}
