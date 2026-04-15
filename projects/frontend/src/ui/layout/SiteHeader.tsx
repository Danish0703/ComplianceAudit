import { useMemo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import ThemeToggle from '../theme/ThemeToggle'
import { ThemeMode } from '../theme/useTheme'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transparency', label: 'Transparency' },
] as const

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type SiteHeaderProps = {
  onOpenWallet: () => void
  themeMode: ThemeMode
  onToggleTheme: () => void
}

export default function SiteHeader({ onOpenWallet, themeMode, onToggleTheme }: SiteHeaderProps) {
  const { activeAddress } = useWallet()

  const walletLabel = useMemo(() => {
    if (!activeAddress) return 'Connect Wallet'
    return `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`
  }, [activeAddress])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-sm font-black text-background shadow-sm">
              CA
            </div>
            <div>
              <p className="text-sm font-black text-foreground">ComplianceAudit</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                On-chain Compliance Command Center
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
          <button
            type="button"
            onClick={onOpenWallet}
            className={cx(
              'rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5',
              activeAddress ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-foreground text-background hover:bg-foreground/90',
            )}
          >
            {walletLabel}
          </button>
        </div>
      </div>
    </header>
  )
}
