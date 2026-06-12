import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'

export const Route = createFileRoute('/login')({
  component: () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)
      try {
        const res = await api.login({ email, password })
        setAuth(res.token, res.user)
        navigate({ to: '/lobby', replace: true })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    return (
      <main className="center-screen">
        <form onSubmit={handleSubmit} className="panel" style={{ width: '100%', maxWidth: 400 }}>
          <span className="kicker">BIENVENIDO</span>
          <h1>INICIAR SESIÓN</h1>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label className="label">EMAIL</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">CONTRASEÑA</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn--primary btn--lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : 'ENTRAR'}
          </button>
          <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
            ¿No tienes cuenta? <Link to="/sign-up" style={{ color: 'var(--gold)' }}>Regístrate</Link>
          </p>
        </form>
      </main>
    )
  },
})
