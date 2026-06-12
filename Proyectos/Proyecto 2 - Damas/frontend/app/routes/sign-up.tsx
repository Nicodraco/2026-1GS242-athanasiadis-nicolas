import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api'
import { setAuth } from '../lib/auth'

export const Route = createFileRoute('/sign-up')({
  component: () => {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)
      try {
        const res = await api.register({ username, email, password })
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
          <span className="kicker">NUEVO</span>
          <h1>REGISTRARSE</h1>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label className="label">USUARIO</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} />
          </div>
          <div className="field">
            <label className="label">EMAIL</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">CONTRASEÑA</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} />
          </div>
          <button className="btn btn--primary btn--lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : 'CREAR CUENTA'}
          </button>
          <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--gold)' }}>Inicia sesión</Link>
          </p>
        </form>
      </main>
    )
  },
})
