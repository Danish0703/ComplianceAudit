/**
 * Compliance Service - Interfaces with on-chain compliance contracts.
 */

import algosdk, { getApplicationAddress } from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlertEngineClient } from '../contracts/AlertEngine'
import { BlacklistWhitelistClient } from '../contracts/BlacklistWhitelist'
import { CertificateManagerClient } from '../contracts/CertificateManager'
import { ComplianceAuditClient } from '../contracts/ComplianceAudit'
import { RiskScorerClient } from '../contracts/RiskScorer'
import { TxnValidatorClient } from '../contracts/TxnValidator'

export interface TransactionValidationResult {
  isValid: boolean
  riskScore: number
  severity: string
  message: string
  txId?: string
}

export interface RiskScoreResult {
  overallRisk: number
  fraud: number
  history: number
  violations: number
  blacklist: number
  custom: number
  classification: string
}

export interface Alert {
  id: string
  wallet: string
  severity: string
  timestamp: number
  message: string
  status: string
}

export interface Certificate {
  id: string
  issuer: string
  subject: string
  issuedAt: number
  expiresAt: number
  status: string
  metadata: Record<string, string>
  txId?: string
}

export interface BlacklistEntry {
  wallet: string
  status: string
  reason: string
  addedAt: number
}

export interface TransactionRecord {
  id: string
  sender: string
  receiver: string
  amount: number
  status: 'approved' | 'flagged' | 'blocked'
  risk_score: number
  timestamp: number
}

export interface ComplianceReport {
  id: number
  periodLabel: string
  reportHash: string
  totalTransactions: number
  suspiciousTransactions: number
  createdRound: number
  submitter: string
}

export interface WalletAuditMetrics {
  wallet: string
  transactionCount: number
  suspiciousCount: number
  lastRiskScore: number
  lastReason: string
}

export interface OrganizationVerification {
  wallet: string
  isVerified: boolean
  certificateAssetId: number
}

export interface CompliancePermissions {
  wallet: string
  txnValidatorCreator?: string
  riskScorerCreator?: string
  alertEngineCreator?: string
  certificateManagerCreator?: string
  blacklistWhitelistCreator?: string
  complianceAuditCreator?: string
  isTxnValidatorCreator: boolean
  isRiskScorerCreator: boolean
  isAlertEngineCreator: boolean
  isCertificateManagerCreator: boolean
  isBlacklistWhitelistCreator: boolean
  isComplianceAuditCreator: boolean
}

export type WalletFundingStatus = {
  address: string
  microAlgos: number
  algos: number
}

type ComplianceAppIds = {
  txnValidator: number
  riskScorer: number
  alertEngine: number
  certificateManager: number
  blacklistWhitelist: number
  complianceAudit: number
}

function readAppId(value: string | undefined): number {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function getAppIds(): ComplianceAppIds {
  return {
    txnValidator: readAppId(import.meta.env.VITE_TXN_VALIDATOR_APP_ID),
    riskScorer: readAppId(import.meta.env.VITE_RISK_SCORER_APP_ID),
    alertEngine: readAppId(import.meta.env.VITE_ALERT_ENGINE_APP_ID),
    certificateManager: readAppId(import.meta.env.VITE_CERTIFICATE_MANAGER_APP_ID),
    blacklistWhitelist: readAppId(import.meta.env.VITE_BLACKLIST_WHITELIST_APP_ID),
    complianceAudit: readAppId(import.meta.env.VITE_COMPLIANCE_AUDIT_APP_ID),
  }
}

function ensureConfiguredAppId(appId: number, label: string): bigint {
  if (!appId) {
    throw new Error(`${label} app ID is not configured for this network`)
  }
  return BigInt(appId)
}

function tryDecodeBase64(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4
    const base64 = padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}

function decodeBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value.filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255))
  if (typeof value === 'bigint') {
    const bytes = new Uint8Array(8)
    const view = new DataView(bytes.buffer)
    view.setBigUint64(0, value, false)
    return bytes
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    const bytes = new Uint8Array(8)
    const view = new DataView(bytes.buffer)
    view.setBigUint64(0, BigInt(Math.floor(value)), false)
    return bytes
  }
  if (typeof value !== 'string' || value.length === 0) return new Uint8Array()

  const asBase64 = tryDecodeBase64(value)
  if (asBase64) return asBase64

  return new TextEncoder().encode(value)
}

function decodeAccount(value: unknown): string {
  if (typeof value === 'string') {
    const candidate = value.trim()
    if (algosdk.isValidAddress(candidate)) return candidate
  }

  const bytes = decodeBytes(value)
  if (bytes.length !== 32) {
    return typeof value === 'string' ? value : ''
  }

  try {
    return algosdk.encodeAddress(bytes)
  } catch {
    return typeof value === 'string' ? value : ''
  }
}

function decodeUint64(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)

  const bytes = decodeBytes(value)
  if (bytes.length < 8) return 0
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return Number(view.getBigUint64(0, false))
}

function safeNumber(value: bigint | number | undefined, fallback = 0): number {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return fallback
}

function classifyRisk(score: number): string {
  if (score <= 25) return 'low'
  if (score <= 50) return 'medium'
  if (score <= 75) return 'high'
  return 'critical'
}

function extractTxId(value: unknown): string | undefined {
  const anyValue = value as any
  const candidates = [
    anyValue?.txId,
    anyValue?.transactionId,
    anyValue?.transactionID,
    anyValue?.txID,
    anyValue?.txid,
    anyValue?.transaction?.txID?.(),
    anyValue?.transaction?.txId,
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
  }
  return undefined
}

export type ChainWriteResult<T = void> = T & { txId?: string }

function statusFromRisk(score: number): 'approved' | 'flagged' | 'blocked' {
  if (score <= 50) return 'approved'
  if (score <= 75) return 'flagged'
  return 'blocked'
}

function microAlgosToAlgo(amountMicroAlgos: number): number {
  return amountMicroAlgos / 1_000_000
}

function normalizeAddress(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function isCreatorMatch(creatorAddress: string | undefined, walletAddress: string): boolean {
  if (!creatorAddress || !walletAddress) return false
  return normalizeAddress(creatorAddress) === normalizeAddress(walletAddress)
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 10000): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }
}

function createClientContext(transactionSigner?: any) {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  if (transactionSigner) {
    algorand.setDefaultSigner(transactionSigner)
  }

  const appIds = getAppIds()

  return {
    algorand,
    appIds,
    txnValidator: new TxnValidatorClient({
      appId: ensureConfiguredAppId(appIds.txnValidator, 'TxnValidator'),
      algorand,
      defaultSigner: transactionSigner,
    }),
    riskScorer: new RiskScorerClient({
      appId: ensureConfiguredAppId(appIds.riskScorer, 'RiskScorer'),
      algorand,
      defaultSigner: transactionSigner,
    }),
    alertEngine: new AlertEngineClient({
      appId: ensureConfiguredAppId(appIds.alertEngine, 'AlertEngine'),
      algorand,
      defaultSigner: transactionSigner,
    }),
    certificateManager: new CertificateManagerClient({
      appId: ensureConfiguredAppId(appIds.certificateManager, 'CertificateManager'),
      algorand,
      defaultSigner: transactionSigner,
    }),
    blacklistWhitelist: new BlacklistWhitelistClient({
      appId: ensureConfiguredAppId(appIds.blacklistWhitelist, 'BlacklistWhitelist'),
      algorand,
      defaultSigner: transactionSigner,
    }),
    complianceAudit: new ComplianceAuditClient({
      appId: ensureConfiguredAppId(appIds.complianceAudit, 'ComplianceAudit'),
      algorand,
      defaultSigner: transactionSigner,
    }),
  }
}

async function getCurrentRound(algorand: AlgorandClient): Promise<number> {
  const status = await algorand.client.algod.status().do()
  return Number(status.lastRound ?? 0)
}

async function getWalletBalanceMicroAlgos(algorand: AlgorandClient, wallet: string): Promise<number> {
  try {
    const info = await algorand.client.algod.accountInformation(wallet).do()
    const amount = Number((info as any)?.amount ?? (info as any)?.['amount'] ?? 0)
    return Number.isFinite(amount) ? amount : 0
  } catch {
    // If the account has never been funded on-chain, algod will fail the lookup.
    // Treat this as 0 balance so the UI can provide a clear funding message.
    return 0
  }
}

function microAlgosToAlgos(amountMicroAlgos: number): number {
  return amountMicroAlgos / 1_000_000
}

async function getLatestAppCallTimestamp(algorand: AlgorandClient, appId: number, wallet: string): Promise<number> {
  try {
    const response = await algorand.client.indexer.searchForTransactions().address(wallet).txType('appl').do()
    const match = (response.transactions || [])
      .filter((transaction: any) => Number(transaction.applicationTransaction?.applicationId ?? 0) === appId)
      .sort(
        (left: any, right: any) =>
          Number(right.confirmedRound ?? right['confirmed-round'] ?? 0) - Number(left.confirmedRound ?? left['confirmed-round'] ?? 0),
      )[0]

    return Number(match?.roundTime ?? Math.floor(Date.now() / 1000)) * 1000
  } catch {
    return Date.now()
  }
}

function mapSeverity(score: number): string {
  return classifyRisk(score)
}

function mapCertificateStatus(active: number, expiryRound: number, currentRound: number): string {
  if (active !== 1) return 'revoked'
  if (currentRound > expiryRound) return 'expired'
  return 'active'
}

async function getAppCreator(algorand: AlgorandClient, appId: number): Promise<string | undefined> {
  if (!appId) return undefined
  try {
    const app = await algorand.client.algod.getApplicationByID(appId).do()
    const params = (app as any)?.params ?? {}
    return String(params.creator ?? params.creatorAddress ?? '').trim() || undefined
  } catch {
    return undefined
  }
}

export const complianceService = {
  async getFundingStatus(wallet: string): Promise<WalletFundingStatus> {
    const { algorand } = createClientContext()
    const microAlgos = await getWalletBalanceMicroAlgos(algorand, wallet)
    return { address: wallet, microAlgos, algos: microAlgosToAlgos(microAlgos) }
  },

  getAppAddress(appId: number): string {
    if (!appId || appId <= 0) return ''
    return String(getApplicationAddress(appId))
  },

  async fundAppAccount(senderWallet: string, appId: number, amountMicroAlgos: number, transactionSigner?: any): Promise<ChainWriteResult> {
    const { algorand } = createClientContext(transactionSigner)
    const receiver = String(getApplicationAddress(appId))
    const micro = Math.max(0, Math.floor(amountMicroAlgos))
    const response = await algorand.send.payment({
      sender: senderWallet,
      receiver,
      amount: algokit.microAlgos(BigInt(micro)),
    })
    return { txId: extractTxId(response) }
  },
  async getPermissions(wallet: string): Promise<CompliancePermissions> {
    const { algorand, appIds } = createClientContext()
    const [
      txnValidatorCreator,
      riskScorerCreator,
      alertEngineCreator,
      certificateManagerCreator,
      blacklistWhitelistCreator,
      complianceAuditCreator,
    ] = await Promise.all([
      getAppCreator(algorand, appIds.txnValidator),
      getAppCreator(algorand, appIds.riskScorer),
      getAppCreator(algorand, appIds.alertEngine),
      getAppCreator(algorand, appIds.certificateManager),
      getAppCreator(algorand, appIds.blacklistWhitelist),
      getAppCreator(algorand, appIds.complianceAudit),
    ])

    return {
      wallet,
      txnValidatorCreator,
      riskScorerCreator,
      alertEngineCreator,
      certificateManagerCreator,
      blacklistWhitelistCreator,
      complianceAuditCreator,
      isTxnValidatorCreator: isCreatorMatch(txnValidatorCreator, wallet),
      isRiskScorerCreator: isCreatorMatch(riskScorerCreator, wallet),
      isAlertEngineCreator: isCreatorMatch(alertEngineCreator, wallet),
      isCertificateManagerCreator: isCreatorMatch(certificateManagerCreator, wallet),
      isBlacklistWhitelistCreator: isCreatorMatch(blacklistWhitelistCreator, wallet),
      isComplianceAuditCreator: isCreatorMatch(complianceAuditCreator, wallet),
    }
  },

  async validateTransaction(wallet: string, amountMicroAlgos: number, transactionSigner?: any): Promise<TransactionValidationResult> {
    const { txnValidator } = createClientContext(transactionSigner)
    const response = await txnValidator.send.validateTransaction({
      args: {
        sender: wallet,
        receiver: String(getApplicationAddress(Number(txnValidator.appClient.appId))),
        amount: BigInt(amountMicroAlgos),
      },
      sender: wallet,
    })

    const threshold = Number((await txnValidator.appClient.state.global.getValue('alert_threshold')) ?? 70)
    const returnedScore = Number((response as any).returnValue ?? (response as any).abiReturn ?? 0)
    const riskScore =
      Number.isFinite(returnedScore) && returnedScore > 0 ? returnedScore : Math.min(100, Math.round(amountMicroAlgos / 100000))

    return {
      isValid: riskScore <= threshold,
      riskScore,
      severity: mapSeverity(riskScore),
      message:
        riskScore <= threshold
          ? 'Transaction validated on-chain and remains under the configured alert threshold.'
          : 'Transaction validated on-chain but exceeds the configured alert threshold.',
      txId: extractTxId(response),
    }
  },

  async scoreRisk(wallet: string, amountMicroAlgos: number, transactionSigner?: any): Promise<RiskScoreResult> {
    const { riskScorer, blacklistWhitelist, txnValidator } = createClientContext(transactionSigner)
    const amountAlgo = microAlgosToAlgo(amountMicroAlgos)
    const blacklisted = await withTimeout(
      blacklistWhitelist.isBlacklisted({ args: { wallet }, sender: wallet }).catch(() => false),
      'Blacklist lookup',
    ).catch(() => false)
    const blocked = await withTimeout(
      txnValidator.isWalletBlocked({ args: { wallet }, sender: wallet }).catch(() => false),
      'Wallet block lookup',
    ).catch(() => false)

    const fraud = Math.min(100, Math.round(amountAlgo > 100 ? 75 : amountAlgo > 10 ? 45 : 15))
    const history = Math.min(100, Math.round(amountAlgo > 50 ? 45 : 25))
    const violations = blocked ? 90 : 20
    const blacklist = blacklisted ? 100 : 0
    const custom = Math.min(100, Math.round(amountAlgo > 1 ? 30 : 10))

    const overallRiskRaw = await withTimeout(
      Promise.resolve(
        riskScorer.calculateCompositeScore({
          args: {
            fraudScore: BigInt(fraud),
            txHistoryScore: BigInt(history),
            violationScore: BigInt(violations),
            blacklistScore: BigInt(blacklist),
            customRuleScore: BigInt(custom),
          },
          sender: wallet,
        }),
      ).catch(() => NaN),
      'Risk score calculation',
    ).catch(() => NaN)
    const overallRisk = Number(overallRiskRaw)

    const normalizedRisk = Number.isFinite(overallRisk)
      ? overallRisk
      : Math.min(100, Math.round((fraud * 30 + history * 25 + violations * 20 + blacklist * 15 + custom * 10) / 100))

    return {
      overallRisk: normalizedRisk,
      fraud,
      history,
      violations,
      blacklist,
      custom,
      classification: classifyRisk(normalizedRisk),
    }
  },

  async getAlerts(wallet?: string): Promise<Alert[]> {
    const { algorand, alertEngine } = createClientContext()
    const latestScoreMap = await alertEngine.appClient.state.box.getMap('latest_score')
    const latestSeverityMap = await alertEngine.appClient.state.box.getMap('latest_severity')
    const latestReasonMap = await alertEngine.appClient.state.box.getMap('latest_reason')
    const alertCountMap = await alertEngine.appClient.state.box.getMap('alert_count')

    const wallets = wallet ? [wallet] : Array.from(latestReasonMap.keys()).map((value) => String(value))
    const appId = Number(alertEngine.appClient.appId)

    const alerts = await Promise.all(
      wallets.map(async (account) => {
        const message = String(latestReasonMap.get(account) ?? '')
        if (!message) return null

        const score = Number(latestScoreMap.get(account) ?? 0n)
        const severity = String(latestSeverityMap.get(account) ?? mapSeverity(score))
        const timestamp = await getLatestAppCallTimestamp(algorand, appId, account)
        const count = Number(alertCountMap.get(account) ?? 0n)

        return {
          id: `${account}-${count || 'latest'}`,
          wallet: account,
          severity,
          timestamp,
          message,
          status: count > 1 ? 'active' : 'pending',
        } satisfies Alert
      }),
    )

    return alerts.filter((alert): alert is Alert => Boolean(alert)).sort((left, right) => right.timestamp - left.timestamp)
  },

  async createAlert(wallet: string, severity: string, message: string, transactionSigner?: any): Promise<Alert> {
    const { algorand, alertEngine, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.alertEngine)
    if (!isCreatorMatch(creatorAddress, wallet)) {
      throw new Error('Only the AlertEngine creator wallet can emit on-chain alerts')
    }

    const score = severity === 'critical' ? 95 : severity === 'high' ? 80 : severity === 'medium' ? 55 : 20
    const response = await alertEngine.send.emitAlert({
      args: {
        wallet,
        score: BigInt(score),
        reason: message,
      },
      sender: wallet,
    })

    return {
      id: `${wallet}-${Date.now()}`,
      wallet,
      severity: mapSeverity(score),
      timestamp: await getLatestAppCallTimestamp(algorand, Number(alertEngine.appClient.appId), wallet),
      message,
      status: 'active',
      txId: extractTxId(response),
    }
  },

  async getCertificates(subject?: string): Promise<Certificate[]> {
    const { algorand, certificateManager } = createClientContext()
    const currentRound = await getCurrentRound(algorand)
    const ownerMap = await certificateManager.appClient.state.box.getMap('certificate_owner')
    const metadataMap = await certificateManager.appClient.state.box.getMap('certificate_metadata')
    const expiryMap = await certificateManager.appClient.state.box.getMap('certificate_expiry')
    const activeMap = await certificateManager.appClient.state.box.getMap('certificate_active')

    const certificates = await Promise.all(
      Array.from(ownerMap.entries())
        .map(([id, owner]) => ({ id: String(id), owner: String(owner) }))
        .filter(({ owner }) => (subject ? owner === subject : true))
        .map(async ({ id, owner }) => {
          const certificateId = Number(id)
          const metadata = String(metadataMap.get(id) ?? '')
          const expiryRound = Number(expiryMap.get(id) ?? 0n)
          const isActive = Number(activeMap.get(id) ?? 0n)
          const issuedAt = await getLatestAppCallTimestamp(algorand, Number(certificateManager.appClient.appId), owner)

          return {
            id: String(certificateId),
            issuer: owner,
            subject: owner,
            issuedAt,
            expiresAt: expiryRound,
            status: mapCertificateStatus(isActive, expiryRound, currentRound),
            metadata: { hash: metadata },
          } satisfies Certificate
        }),
    )

    return certificates.sort((left, right) => right.issuedAt - left.issuedAt)
  },

  async issueCertificate(
    issuer: string,
    subject: string,
    expiresIn: number = 86400000,
    metadataHash?: string,
    transactionSigner?: any,
  ): Promise<Certificate> {
    const { algorand, certificateManager, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.certificateManager)
    if (!isCreatorMatch(creatorAddress, issuer)) {
      throw new Error('Only the CertificateManager creator wallet can issue certificates')
    }

    const currentRound = await getCurrentRound(algorand)
    const expiryRounds = Math.max(1, Math.ceil(expiresIn / 4500))
    const finalMetadata = metadataHash && metadataHash.trim().length > 0 ? metadataHash : `issuer:${issuer}`

    const response = await certificateManager.send.issueCertificate({
      args: {
        wallet: subject,
        metadataHash: finalMetadata,
        expiresAtRound: BigInt(currentRound + expiryRounds),
      },
      sender: issuer,
    })

    const certificateId = Number((response as any).returnValue ?? (response as any).abiReturn ?? 0)
    const effectiveId =
      certificateId > 0
        ? certificateId
        : Number((await certificateManager.appClient.state.global.getValue('next_certificate_id')) ?? 1n) - 1

    return {
      id: String(effectiveId),
      issuer,
      subject,
      issuedAt: await getLatestAppCallTimestamp(algorand, Number(certificateManager.appClient.appId), issuer),
      expiresAt: currentRound + expiryRounds,
      status: 'active',
      metadata: { hash: finalMetadata },
      txId: extractTxId(response),
    }
  },

  async revokeCertificate(actorWallet: string, certificateId: string, transactionSigner?: any): Promise<ChainWriteResult> {
    const { algorand, certificateManager, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.certificateManager)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the CertificateManager creator wallet can revoke certificates')
    }

    const response = await certificateManager.send.revokeCertificate({
      args: { certificateId: BigInt(Number(certificateId)) },
      sender: actorWallet,
    })
    return { txId: extractTxId(response) }
  },

  async getBlacklist(): Promise<BlacklistEntry[]> {
    const { algorand, blacklistWhitelist } = createClientContext()
    const blackMap = await blacklistWhitelist.appClient.state.box.getMap('blacklist')
    const whiteMap = await blacklistWhitelist.appClient.state.box.getMap('whitelist')
    const appId = Number(blacklistWhitelist.appClient.appId)

    const wallets = new Set([...blackMap.keys(), ...whiteMap.keys()].map((value) => String(value)))

    return Promise.all(
      Array.from(wallets).map(async (wallet) => {
        const blacklisted = Number(blackMap.get(wallet) ?? 0n) === 1
        const whitelisted = Number(whiteMap.get(wallet) ?? 0n) === 1
        const status = blacklisted ? 'blacklisted' : whitelisted ? 'whitelisted' : 'unlisted'
        return {
          wallet,
          status,
          reason: blacklisted
            ? 'Marked by on-chain blacklist registry'
            : whitelisted
              ? 'Marked by on-chain whitelist registry'
              : 'No entry',
          addedAt: await getLatestAppCallTimestamp(algorand, appId, wallet),
        }
      }),
    )
  },

  async addToBlacklist(actorWallet: string, wallet: string, reason: string, transactionSigner?: any): Promise<BlacklistEntry> {
    const { algorand, blacklistWhitelist, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.blacklistWhitelist)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the BlacklistWhitelist creator wallet can manage blacklist status')
    }

    const response = await blacklistWhitelist.send.setBlacklistStatus({
      args: {
        wallet,
        blocked: true,
      },
      sender: actorWallet,
    })

    return {
      wallet,
      status: 'blacklisted',
      reason,
      addedAt: await getLatestAppCallTimestamp(algorand, Number(blacklistWhitelist.appClient.appId), wallet),
      txId: extractTxId(response),
    }
  },

  async removeFromBlacklist(actorWallet: string, wallet: string, transactionSigner?: any): Promise<ChainWriteResult> {
    const { algorand, blacklistWhitelist, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.blacklistWhitelist)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the BlacklistWhitelist creator wallet can manage blacklist status')
    }

    const response = await blacklistWhitelist.send.setBlacklistStatus({
      args: {
        wallet,
        blocked: false,
      },
      sender: actorWallet,
    })
    return { txId: extractTxId(response) }
  },

  async setDpdpConsent(senderWallet: string, targetWallet: string, consented: boolean, transactionSigner?: any): Promise<ChainWriteResult> {
    const { complianceAudit } = createClientContext(transactionSigner)
    const response = await complianceAudit.send.setDpdpConsent({
      args: { wallet: targetWallet, consented },
      sender: senderWallet,
    })
    return { txId: extractTxId(response) }
  },

  async hasDpdpConsent(wallet: string): Promise<boolean> {
    const { complianceAudit } = createClientContext()
    return complianceAudit.hasDpdpConsent({ args: { wallet }, sender: wallet })
  },

  async recordTransactionAssessment(
    actorWallet: string,
    wallet: string,
    riskScore: number,
    isSuspicious: boolean,
    reason: string,
    txReference: string,
    evidenceHash: string,
    transactionSigner?: any,
  ): Promise<ChainWriteResult> {
    const { algorand, complianceAudit, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.complianceAudit)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the ComplianceAudit creator wallet can record assessments')
    }

    const response = await complianceAudit.send.recordTransactionAssessment({
      args: {
        wallet,
        riskScore: BigInt(Math.max(0, Math.min(100, Math.floor(riskScore)))),
        isSuspicious,
        reason,
        txReference,
        evidenceHash,
      },
      sender: actorWallet,
    })
    return { txId: extractTxId(response) }
  },

  async getWalletAuditMetrics(wallet: string): Promise<WalletAuditMetrics> {
    const { complianceAudit } = createClientContext()
    const [transactionCount, suspiciousCount, lastRiskScore, lastReason] = await complianceAudit.getWalletMetrics({
      args: { wallet },
      sender: wallet,
    })

    return {
      wallet,
      transactionCount: safeNumber(transactionCount),
      suspiciousCount: safeNumber(suspiciousCount),
      lastRiskScore: safeNumber(lastRiskScore),
      lastReason: String(lastReason ?? ''),
    }
  },

  async getTransactionEvidence(txReference: string, callerWallet?: string): Promise<string> {
    const { complianceAudit } = createClientContext()
    const sender =
      callerWallet && callerWallet.length > 0 ? callerWallet : String(getApplicationAddress(Number(complianceAudit.appClient.appId)))
    return complianceAudit.getTxEvidence({ args: { txReference }, sender })
  },

  async submitComplianceReport(
    actorWallet: string,
    periodLabel: string,
    reportHash: string,
    totalTransactions: number,
    suspiciousTransactions: number,
    transactionSigner?: any,
  ): Promise<{ reportId: number; txId?: string }> {
    const { algorand, complianceAudit, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.complianceAudit)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the ComplianceAudit creator wallet can submit compliance reports')
    }

    const response = await complianceAudit.send.submitComplianceReport({
      args: {
        periodLabel,
        reportHash,
        totalTransactions: BigInt(Math.max(0, Math.floor(totalTransactions))),
        suspiciousTransactions: BigInt(Math.max(0, Math.floor(suspiciousTransactions))),
      },
      sender: actorWallet,
    })

    return {
      reportId: safeNumber((response as any).return ?? (response as any).returnValue ?? (response as any).abiReturn),
      txId: extractTxId(response),
    }
  },

  async getComplianceReport(reportId: number, callerWallet?: string): Promise<ComplianceReport> {
    const { complianceAudit } = createClientContext()
    const sender =
      callerWallet && callerWallet.length > 0 ? callerWallet : String(getApplicationAddress(Number(complianceAudit.appClient.appId)))
    const [periodLabel, reportHash, totalTransactions, suspiciousTransactions, createdRound, submitter] = await complianceAudit.getReport({
      args: { reportId: BigInt(Math.max(0, Math.floor(reportId))) },
      sender,
    })

    return {
      id: Math.max(0, Math.floor(reportId)),
      periodLabel: String(periodLabel ?? ''),
      reportHash: String(reportHash ?? ''),
      totalTransactions: safeNumber(totalTransactions),
      suspiciousTransactions: safeNumber(suspiciousTransactions),
      createdRound: safeNumber(createdRound),
      submitter: String(submitter ?? ''),
    }
  },

  async registerVerifiedOrganization(
    actorWallet: string,
    organizationWallet: string,
    certificateAssetId: number,
    transactionSigner?: any,
  ): Promise<ChainWriteResult> {
    const { algorand, complianceAudit, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.complianceAudit)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the ComplianceAudit creator wallet can register organizations')
    }

    const response = await complianceAudit.send.registerVerifiedOrganization({
      args: {
        organizationWallet,
        certificateAssetId: BigInt(Math.max(0, Math.floor(certificateAssetId))),
      },
      sender: actorWallet,
    })
    return { txId: extractTxId(response) }
  },

  async revokeVerifiedOrganization(actorWallet: string, organizationWallet: string, transactionSigner?: any): Promise<ChainWriteResult> {
    const { algorand, complianceAudit, appIds } = createClientContext(transactionSigner)
    const creatorAddress = await getAppCreator(algorand, appIds.complianceAudit)
    if (!isCreatorMatch(creatorAddress, actorWallet)) {
      throw new Error('Only the ComplianceAudit creator wallet can revoke organizations')
    }

    const response = await complianceAudit.send.revokeVerifiedOrganization({
      args: { organizationWallet },
      sender: actorWallet,
    })
    return { txId: extractTxId(response) }
  },

  async getOrganizationVerification(organizationWallet: string, callerWallet?: string): Promise<OrganizationVerification> {
    const { complianceAudit } = createClientContext()
    const sender =
      callerWallet && callerWallet.length > 0 ? callerWallet : String(getApplicationAddress(Number(complianceAudit.appClient.appId)))
    const [isVerified, certificateAssetId] = await complianceAudit.getOrganizationVerification({
      args: { organizationWallet },
      sender,
    })

    return {
      wallet: organizationWallet,
      isVerified: Boolean(isVerified),
      certificateAssetId: safeNumber(certificateAssetId),
    }
  },

  async getTransactions(wallet?: string): Promise<TransactionRecord[]> {
    const { algorand, txnValidator } = createClientContext()
    const appId = Number(txnValidator.appClient.appId)
    const appAddress = String(getApplicationAddress(appId))
    const response = wallet
      ? await withTimeout(algorand.client.indexer.searchForTransactions().address(wallet).txType('appl').do(), 'Transaction history lookup')
      : await withTimeout(
          algorand.client.indexer.searchForTransactions().address(appAddress).txType('appl').do(),
          'Transaction history lookup',
        )

    return (response.transactions || [])
      .filter((transaction: any) => {
        const appTxn = transaction.applicationTransaction ?? transaction['application-transaction'] ?? {}
        return Number(appTxn.applicationId ?? appTxn['application-id'] ?? 0) === appId
      })
      .filter((transaction: any) => {
        const sender = String(transaction.sender ?? transaction['sender'] ?? '')
        return wallet ? sender === wallet : true
      })
      .map((transaction: any) => {
        const appTxn = transaction.applicationTransaction ?? transaction['application-transaction'] ?? {}
        const args = appTxn.applicationArgs ?? appTxn['application-args'] ?? []
        const sender = (args[1] ? decodeAccount(args[1]) : '') || String(transaction.sender ?? transaction['sender'] ?? '')
        const receiver = args[2] ? decodeAccount(args[2]) : String(getApplicationAddress(appId))
        const amountMicroAlgos = args[3] ? decodeUint64(args[3]) : 0
        const amount = amountMicroAlgos / 1_000_000
        const score = amountMicroAlgos > 0 ? Math.min(100, Math.round(amountMicroAlgos / 100000)) : 0
        const timestamp = Number(transaction.roundTime ?? transaction['round-time'] ?? Math.floor(Date.now() / 1000)) * 1000

        return {
          id: String(transaction.id),
          sender,
          receiver,
          amount,
          status: statusFromRisk(score),
          risk_score: score,
          timestamp,
        } satisfies TransactionRecord
      })
      .sort((left: TransactionRecord, right: TransactionRecord) => right.timestamp - left.timestamp)
  },
}
