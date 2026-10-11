import { Link, useNavigate } from 'react-router-dom'
import {
  UserRound,
  Mail,
  GraduationCap,
  ShieldCheck,
  Package,
  Bookmark,
  LogOut,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { PageHeader, Eyebrow } from '../components/ui/Editorial'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/marketplace', { replace: true })
  }

  const initials = (user?.name || user?.email || 'U')
    .trim()
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const details = [
    {
      label: 'Full name',
      value: user?.name || 'Not provided',
      icon: UserRound,
    },
    {
      label: 'Email address',
      value: user?.email || 'Not provided',
      icon: Mail,
    },
    {
      label: 'Course',
      value: user?.course || 'Not provided',
      icon: GraduationCap,
    },
    {
      label: 'Account type',
      value: user?.role === 'admin' ? 'Administrator' : 'Student',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Your account"
        title="Profile"
        description="Your CampusMarket identity and account details."
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-8">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-semibold text-primary"
            aria-label={`Profile initials: ${initials}`}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <Eyebrow>CampusMarket member</Eyebrow>
            <h2 className="mt-2 break-words font-display text-heading text-foreground">
              {user?.name || 'Your account'}
            </h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">
              {user?.email || 'Email unavailable'}
            </p>
          </div>

          <span className="w-fit rounded-full border border-border px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
            {user?.role === 'admin' ? 'Administrator' : 'Student'}
          </span>
        </div>

        <div className="divide-y divide-border">
          {details.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-start gap-4 px-6 py-5 sm:px-8"
            >
              <div className="mt-0.5 rounded-lg bg-muted p-2">
                <Icon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-foreground">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-heading text-foreground">
          Your CampusMarket
        </h2>

        <Link
          to="/dashboard"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:p-5"
        >
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">My Items</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your listings and sales.
            </p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/saved"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:p-5"
        >
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Bookmark className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Saved items</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Return to products you have bookmarked.
            </p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </section>

      <section className="rounded-2xl border border-border p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Sign out</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign out of this CampusMarket account on this device.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </section>
    </div>
  )
}
