import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const supportedWallets: SupportedWallet[] =
    algodConfig.network === 'localnet'
      ? [
          {
            id: WalletId.KMD,
            options: {
              baseServer: getKmdConfigFromViteEnvironment().server,
              token: String(getKmdConfigFromViteEnvironment().token),
              port: String(getKmdConfigFromViteEnvironment().port),
            },
          },
        ]
      : [{ id: WalletId.PERA }]

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}
