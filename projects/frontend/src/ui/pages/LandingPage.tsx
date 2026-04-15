import { Link } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const features = [
  {
    title: 'DPDP consent & proof',
    description: 'Record consent state and evidence hashes on-chain for regulator-grade audit trails.',
  },
  {
    title: 'Role-gated actions (on-chain)',
    description: 'Regulator/issuer actions are enforced by smart contracts—not by a server checkbox.',
  },
  {
    title: 'Indexer-backed transparency',
    description: 'Reads are Indexer-first. Every write yields a tx id and explorer evidence.',
  },
  {
    title: 'Alerts & certificates',
    description: 'Issue compliance certificates and generate alerts with verifiable on-chain history.',
  },
] as const

export default function LandingPage() {
  const { activeAddress } = useWallet()

  return (
    <div className="space-y-14">
      <section className="tilt-3d surface-elevated relative overflow-hidden rounded-[2rem] p-8 backdrop-blur sm:p-10">
        <div className="glow-orb pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-cyan-400/25 dark:bg-cyan-400/15" />
        <div className="glow-orb pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-indigo-500/25 dark:bg-indigo-500/18" />
        <div className="glow-orb pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-emerald-400/20 dark:bg-emerald-400/12" />

        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                Round 2 • RegTech • Algorand
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                Pure Web3
              </Badge>
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl">
              ComplianceAudit
              <span className="block bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                On-chain RegTech command center.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base text-muted-foreground">
              Monitor activity, record assessments, issue certificates, and publish regulator-friendly reports—end to end with wallet signing,
              transaction confirmation, and explorer-verifiable evidence.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild className="h-11 rounded-2xl px-6 text-sm font-semibold shadow-sm">
                <Link to="/dashboard">Open Dashboard</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-2xl px-6 text-sm font-semibold">
                <Link to="/transparency">On-chain Transparency</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                Wallet: {activeAddress ? `${activeAddress.slice(0, 8)}…${activeAddress.slice(-6)}` : 'Not connected'}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                Stack: Frontend + Contracts + Indexer (no backend)
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                Network: {import.meta.env.VITE_ALGOD_NETWORK || 'unknown'}
              </Badge>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="tilt-3d rounded-[2rem] border-border bg-card/90 shadow-[0_25px_65px_-45px_rgba(15,23,42,0.9)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-black">Demo flow (Round 2)</CardTitle>
                <CardDescription>UI click → wallet signature → confirmation → explorer proof.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  'Connect wallet (Pera, TestNet).',
                  'Run one end-to-end compliance action (consent / assessment / report).',
                  'Open the tx id on explorer to verify proof.',
                ].map((step, idx) => (
                  <div key={step} className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 backdrop-blur">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-black text-background">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <Card key={feature.title} className="tilt-3d rounded-[2rem] border-border bg-card/70 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg font-black text-foreground">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="rounded-[2rem] border-slate-200 bg-slate-950 text-white shadow-[0_25px_65px_-45px_rgba(15,23,42,0.9)] lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Built like a product.</CardTitle>
            <CardDescription className="text-slate-300">
              Clean UI, consistent theming, and every important action is verifiable on-chain with explorer links.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 hover:bg-slate-100">
              <Link to="/dashboard">Start Demo</Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 rounded-2xl px-6 text-sm font-semibold">
              <Link to="/transparency">View Proof</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 bg-white/80 shadow-sm backdrop-blur lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg font-black">FAQ</CardTitle>
            <CardDescription>Quick answers for judges and reviewers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Do you need a backend?</AccordionTrigger>
                <AccordionContent>No. Writes go to Algod via wallet signing, reads come from the Indexer.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>How do I verify actions?</AccordionTrigger>
                <AccordionContent>Every write surfaces a tx id; open it on an explorer directly from the UI.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Why does “balance below min” happen?</AccordionTrigger>
                <AccordionContent>Some actions require MBR for app accounts / box storage—fund the failing address once.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
