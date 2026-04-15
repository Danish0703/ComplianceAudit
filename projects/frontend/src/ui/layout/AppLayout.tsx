import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ConnectWallet from '../../components/ConnectWallet'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import { useTheme } from '../theme/useTheme'

export default function AppLayout() {
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard')
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const { mode, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_80%_18%,rgba(20,184,166,0.14),transparent_40%),linear-gradient(180deg,hsl(var(--background))_0%,rgba(59,130,246,0.06)_100%)] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.14),transparent_40%),linear-gradient(180deg,hsl(var(--background))_0%,rgba(2,6,23,1)_100%)]">
      <SiteHeader onOpenWallet={() => setWalletModalOpen(true)} themeMode={mode} onToggleTheme={toggle} />
      <main
        className={isDashboard ? 'mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8'}
      >
        <Outlet />
      </main>
      <SiteFooter />

      <ConnectWallet openModal={walletModalOpen} closeModal={() => setWalletModalOpen(false)} />
    </div>
  )
}
