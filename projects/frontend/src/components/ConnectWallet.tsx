import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form
        method="dialog"
        className="modal-box max-w-xl rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.9)]"
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Wallet</p>
              <h3 className="mt-2 text-2xl font-black text-slate-900">Connect your wallet</h3>
              <p className="mt-2 text-sm text-slate-600">Sign on-chain compliance actions and view explorer-linked confirmations.</p>
            </div>
            <button
              type="button"
              data-test-id="close-wallet-modal"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => closeModal()}
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {activeAddress && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Connected account</p>
              <div className="mt-3">
                <Account />
              </div>
            </div>
          )}

          {!activeAddress && (
            <div className="mt-1 grid gap-3">
              {wallets?.map((wallet) => (
                <button
                  type="button"
                  data-test-id={`${wallet.id}-connect`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  key={`provider-${wallet.id}`}
                  onClick={() => wallet.connect()}
                >
                  <div className="flex items-center gap-3">
                    {!isKmd(wallet) && (
                      <img
                        alt={`wallet_icon_${wallet.id}`}
                        src={wallet.metadata.icon}
                        style={{ objectFit: 'contain', width: '32px', height: '32px' }}
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {isKmd(wallet) ? 'Recommended for local testing' : 'Recommended for TestNet demos'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                    Connect
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {activeAddress && (
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-400"
                data-test-id="logout"
                onClick={async () => {
                  if (wallets) {
                    const activeWallet = wallets.find((w) => w.isActive)
                    if (activeWallet) {
                      await activeWallet.disconnect()
                    } else {
                      localStorage.removeItem('@txnlab/use-wallet:v3')
                      window.location.reload()
                    }
                  }
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </form>
    </dialog>
  )
}
export default ConnectWallet
