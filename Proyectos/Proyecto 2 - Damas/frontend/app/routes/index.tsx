import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getAuth } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: () => {
    const navigate = useNavigate()
    useEffect(() => {
      const auth = getAuth()
      navigate({ to: auth ? '/lobby' : '/login', replace: true })
    }, [])
    return <div className="center-screen"><p className="muted">Cargando...</p></div>
  },
})
