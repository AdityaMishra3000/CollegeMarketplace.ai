import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/layout/AuthLayout'
import { Input, Field, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const COURSES = [
  'Information Technology',
  'Computer Science',
  'Engineering',
  'Business',
  'Other',
]

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    course: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch {
      // AuthContext raises the toast.
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      image="/landing/class.jpeg"
      imageAlt="A graduating cohort photographed together in front of the campus mural"
      caption="Everyone here is a student at your college. That is the whole point."
      eyebrow="Join your campus"
      title="Create an account"
      footer={
        <>
          Already registered?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-ink underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Full name" htmlFor="name" required>
          <Input
            id="name"
            autoComplete="name"
            autoFocus
            placeholder="Aarav Sharma"
            value={form.name}
            onChange={update('name')}
            required
          />
        </Field>

        {/* The API requires a .edu.in address; the old placeholder said .edu, so
            registration failed with no explanation. */}
        <Field
          label="College email"
          htmlFor="email"
          hint="Must be your institutional .edu.in address"
          required
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@college.edu.in"
            value={form.email}
            onChange={update('email')}
            required
          />
        </Field>

        {/* Collected here because it becomes the contact number on every listing.
            Without it the backend fell back to a shared placeholder number. */}
        <Field
          label="Mobile number"
          htmlFor="phone"
          hint="10 digits — buyers use this to reach you"
          required
        >
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            pattern="(\+91)?[0-9]{10}"
            value={form.phone}
            onChange={update('phone')}
            required
          />
        </Field>

        <Field label="Course" htmlFor="course" required>
          <Select id="course" value={form.course} onChange={update('course')} required>
            <option value="" disabled>
              Select your course
            </option>
            {COURSES.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 8 characters" required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            value={form.password}
            onChange={update('password')}
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          {isLoading ? 'Creating account' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
