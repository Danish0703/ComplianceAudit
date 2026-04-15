import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-black text-foreground">ComplianceAudit</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A pure Web3 compliance command center: Algod for writes, Indexer for reads, all actions verifiable on-chain.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pages</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/" className="font-semibold text-muted-foreground hover:text-foreground">
                Home
              </Link>
              <Link to="/dashboard" className="font-semibold text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <Link to="/transparency" className="font-semibold text-muted-foreground hover:text-foreground">
                Transparency
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hack Series</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Built for AlgoBharat Hack Series 3.0 — Round 2. Focused on one end-to-end flow with on-chain confirmation.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ComplianceAudit. All rights reserved.</p>
          <p className="font-mono">Algorand TestNet demo</p>
        </div>
      </div>
    </footer>
  )
}
