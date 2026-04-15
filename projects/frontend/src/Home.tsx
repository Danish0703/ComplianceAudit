import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AlertBoard from './components/AlertBoard'
import CertificateManager from './components/CertificateManager'
import ComplianceAuditPanel from './components/ComplianceAuditPanel'
import OnChainTransparency from './components/OnChainTransparency'
import RiskHeatmap from './components/RiskHeatmap'
import TransactionMonitor from './components/TransactionMonitor'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type DashboardTab = 'monitor' | 'risk' | 'alerts' | 'certificates' | 'audit' | 'transparency'

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('monitor')
  const { activeAddress } = useWallet()

  const tabs: Array<{ key: DashboardTab; label: string }> = [
    { key: 'monitor', label: 'Transaction Monitor' },
    { key: 'risk', label: 'Risk Heatmap' },
    { key: 'alerts', label: 'Alerts' },
    { key: 'certificates', label: 'Certificates' },
    { key: 'audit', label: 'Compliance Audit' },
    { key: 'transparency', label: 'On-chain Transparency' },
  ]

  return (
    <div className="space-y-6">
      <Card className="surface-elevated overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Dashboard</Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
              On-chain + Indexer verified
            </Badge>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">Compliance Command Center</CardTitle>
          <CardDescription className="max-w-3xl">
            Product-grade workflow UI: every action yields a transaction id and explorer proof. Use the site header to connect wallet and toggle
            theme.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
              Network: {import.meta.env.VITE_ALGOD_NETWORK || 'unknown'}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
              Wallet: {activeAddress ? `${activeAddress.slice(0, 8)}…${activeAddress.slice(-6)}` : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="w-full">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 rounded-2xl border border-border bg-card/70 p-2 shadow-sm backdrop-blur">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="rounded-xl px-4 py-2">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="monitor">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <TransactionMonitor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <RiskHeatmap />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <AlertBoard />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <CertificateManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <ComplianceAuditPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transparency">
          <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <OnChainTransparency />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Home
