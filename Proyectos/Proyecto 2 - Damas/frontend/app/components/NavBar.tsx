import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getAuth, clearAuth, onAuthChange } from '../lib/auth'
import type { AuthState } from '../lib/types'
import '../styles/navbar.css'

export function NavBar() {
  const [auth, setAuthState] = useState<AuthState | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setAuthState(getAuth())
    return onAuthChange(() => setAuthState(getAuth()))
  }, [location.pathname])

  if (!auth) return null

  const handleLogout = () => {
    clearAuth()
    navigate({ to: '/login', replace: true })
  }

  const tab = (href: string, label: string) => {
    const active = location.pathname === href || location.pathname.startsWith(href + '/')
    return <Link to={href} className={active ? 'nav-active' : 'nav-link'}>{label}</Link>
  }

  return (
    <nav className="nav">
      <Link to="/lobby" className="nav-brand">
        <span className="nav-brand-square" />
        DAMAS<span className="nav-brand-slash">//</span>
      </Link>
      <div className="nav-links">
        {tab('/lobby', 'LOBBY')}
        {tab('/marketplace', 'TIENDA')}
        {tab('/ranking', 'RANKING')}
      </div>
      <div className="nav-user">
        <span className="nav-username">@{auth.user.username}</span>
        <button onClick={handleLogout} className="btn btn--ghost">SALIR</button>
      </div>
    </nav>
  )
}
