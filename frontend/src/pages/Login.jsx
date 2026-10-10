import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/layout/AuthLayout'
import { Input, Field } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await login(form.email, form.password)
      // Return to wherever the visitor was heading, if anywhere.
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch {
      // AuthContext raises the toast.
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      image="/landing/Football.jpeg"
      imageAlt="The college football team on the turf pitch"
      caption="Buy it from someone you already share a timetable with."
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          No account yet?{' '}
          <Link
            to="/register"
            className="font-medium text-primary-ink underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="College email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@college.edu.in"
            value={form.email}
            onChange={update('email')}
            required
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          {isLoading ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
