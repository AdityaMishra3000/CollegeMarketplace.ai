import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Input, Field, Select } from '../components/ui/Input'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    course: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const update = (field) => (e) => setFormData({ ...formData, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await register(formData)
      navigate('/dashboard')
    } catch (error) {
      // Handled by toast
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join the campus marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" htmlFor="name">
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={update('name')}
                required
              />
            </Field>
            {/* The API requires a .edu.in address; the old placeholder said
                .edu, so registration failed with no explanation. */}
            <Field
              label="University Email"
              htmlFor="email"
              hint="Must be your institutional .edu.in address"
            >
              <Input
                id="email"
                type="email"
                placeholder="name@college.edu.in"
                value={formData.email}
                onChange={update('email')}
                required
              />
            </Field>
            {/* Collected here because it becomes the contact number on every
                listing. Without it the backend used to fall back to a shared
                placeholder number. */}
            <Field label="Mobile Number" htmlFor="phone" hint="10 digits, used by buyers to reach you">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="9876543210"
                pattern="(\+91)?[0-9]{10}"
                value={formData.phone}
                onChange={update('phone')}
                required
              />
            </Field>
            <Field label="Course / Major" htmlFor="course">
              <Select id="course" value={formData.course} onChange={update('course')} required>
                <option value="" disabled>Select your course</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Engineering">Engineering</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Password" htmlFor="password" hint="At least 8 characters">
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={8}
                value={formData.password}
                onChange={update('password')}
                required
              />
            </Field>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}