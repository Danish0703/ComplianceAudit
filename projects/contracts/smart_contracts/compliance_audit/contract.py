from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64
from algopy.arc4 import abimethod


class ComplianceAudit(ARC4Contract):
    next_report_id: UInt64

    def __init__(self) -> None:
        # Wallet telemetry for live compliance monitoring.
        self.wallet_tx_count = BoxMap(Account, UInt64, key_prefix="ca_tx_")
        self.wallet_suspicious_count = BoxMap(Account, UInt64, key_prefix="ca_susp_")
        self.wallet_last_risk = BoxMap(Account, UInt64, key_prefix="ca_risk_")
        self.wallet_last_reason = BoxMap(Account, String, key_prefix="ca_reason_")
        self.wallet_dpdp_consent = BoxMap(Account, UInt64, key_prefix="ca_consent_")

        # Optional evidence anchoring for transaction assessments.
        self.tx_evidence_hash = BoxMap(String, String, key_prefix="ca_evidence_")

        # Tamper-proof compliance report registry.
        self.report_hash = BoxMap(UInt64, String, key_prefix="ca_rep_hash_")
        self.report_period = BoxMap(UInt64, String, key_prefix="ca_rep_period_")
        self.report_total_tx = BoxMap(UInt64, UInt64, key_prefix="ca_rep_total_")
        self.report_suspicious_tx = BoxMap(UInt64, UInt64, key_prefix="ca_rep_susp_")
        self.report_created_round = BoxMap(UInt64, UInt64, key_prefix="ca_rep_round_")
        self.report_submitter = BoxMap(UInt64, Account, key_prefix="ca_rep_sender_")

        # Organization verification and certificate (ASA) registry.
        self.org_verified = BoxMap(Account, UInt64, key_prefix="ca_org_verified_")
        self.org_certificate_asset_id = BoxMap(Account, UInt64, key_prefix="ca_org_asset_")

        self.next_report_id = UInt64(1)

    @abimethod()
    def set_dpdp_consent(self, wallet: Account, consented: bool) -> None:
        assert wallet == Txn.sender or Txn.sender == Global.creator_address, "Only wallet or creator can set consent"
        self.wallet_dpdp_consent[wallet] = UInt64(1) if consented else UInt64(0)

    @abimethod(readonly=True)
    def has_dpdp_consent(self, wallet: Account) -> bool:
        consent, exists = self.wallet_dpdp_consent.maybe(wallet)
        return exists and consent == UInt64(1)

    @abimethod()
    def record_transaction_assessment(
        self,
        wallet: Account,
        risk_score: UInt64,
        is_suspicious: bool,
        reason: String,
        tx_reference: String,
        evidence_hash: String,
    ) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can record assessments"
        assert risk_score <= UInt64(100), "Risk score must be <= 100"
        assert reason.bytes.length > UInt64(0), "Reason required"
        assert tx_reference.bytes.length > UInt64(0), "Transaction reference required"

        tx_count, tx_exists = self.wallet_tx_count.maybe(wallet)
        self.wallet_tx_count[wallet] = tx_count + UInt64(1) if tx_exists else UInt64(1)

        suspicious_count, suspicious_exists = self.wallet_suspicious_count.maybe(wallet)
        if is_suspicious:
            self.wallet_suspicious_count[wallet] = suspicious_count + UInt64(1) if suspicious_exists else UInt64(1)

        self.wallet_last_risk[wallet] = risk_score
        self.wallet_last_reason[wallet] = reason

        if evidence_hash.bytes.length > UInt64(0):
            self.tx_evidence_hash[tx_reference] = evidence_hash

    @abimethod(readonly=True)
    def get_wallet_metrics(self, wallet: Account) -> tuple[UInt64, UInt64, UInt64, String]:
        tx_count, tx_exists = self.wallet_tx_count.maybe(wallet)
        suspicious_count, suspicious_exists = self.wallet_suspicious_count.maybe(wallet)
        risk, risk_exists = self.wallet_last_risk.maybe(wallet)
        reason, reason_exists = self.wallet_last_reason.maybe(wallet)

        if not tx_exists:
            tx_count = UInt64(0)
        if not suspicious_exists:
            suspicious_count = UInt64(0)
        if not risk_exists:
            risk = UInt64(0)
        if not reason_exists:
            reason = String("")

        return tx_count, suspicious_count, risk, reason

    @abimethod(readonly=True)
    def get_tx_evidence(self, tx_reference: String) -> String:
        evidence, exists = self.tx_evidence_hash.maybe(tx_reference)
        if exists:
            return evidence
        return String("")

    @abimethod()
    def submit_compliance_report(
        self,
        period_label: String,
        report_hash: String,
        total_transactions: UInt64,
        suspicious_transactions: UInt64,
    ) -> UInt64:
        assert Txn.sender == Global.creator_address, "Only creator can submit reports"
        assert period_label.bytes.length > UInt64(0), "Period label required"
        assert report_hash.bytes.length > UInt64(0), "Report hash required"
        assert suspicious_transactions <= total_transactions, "Suspicious count must be <= total"

        report_id = self.next_report_id

        self.report_period[report_id] = period_label
        self.report_hash[report_id] = report_hash
        self.report_total_tx[report_id] = total_transactions
        self.report_suspicious_tx[report_id] = suspicious_transactions
        self.report_created_round[report_id] = Global.round
        self.report_submitter[report_id] = Txn.sender

        self.next_report_id = report_id + UInt64(1)
        return report_id

    @abimethod(readonly=True)
    def get_report(
        self, report_id: UInt64
    ) -> tuple[String, String, UInt64, UInt64, UInt64, Account]:
        period, period_exists = self.report_period.maybe(report_id)
        rep_hash, hash_exists = self.report_hash.maybe(report_id)
        total, total_exists = self.report_total_tx.maybe(report_id)
        suspicious, suspicious_exists = self.report_suspicious_tx.maybe(report_id)
        created_round, round_exists = self.report_created_round.maybe(report_id)
        submitter, submitter_exists = self.report_submitter.maybe(report_id)

        if not period_exists:
            period = String("")
        if not hash_exists:
            rep_hash = String("")
        if not total_exists:
            total = UInt64(0)
        if not suspicious_exists:
            suspicious = UInt64(0)
        if not round_exists:
            created_round = UInt64(0)
        if not submitter_exists:
            submitter = Global.zero_address

        return period, rep_hash, total, suspicious, created_round, submitter

    @abimethod()
    def register_verified_organization(self, organization_wallet: Account, certificate_asset_id: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can register organizations"
        assert certificate_asset_id > UInt64(0), "Certificate asset id must be > 0"

        self.org_verified[organization_wallet] = UInt64(1)
        self.org_certificate_asset_id[organization_wallet] = certificate_asset_id

    @abimethod()
    def revoke_verified_organization(self, organization_wallet: Account) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can revoke organizations"

        self.org_verified[organization_wallet] = UInt64(0)
        self.org_certificate_asset_id[organization_wallet] = UInt64(0)

    @abimethod(readonly=True)
    def get_organization_verification(self, organization_wallet: Account) -> tuple[bool, UInt64]:
        verified, verified_exists = self.org_verified.maybe(organization_wallet)
        asset_id, asset_exists = self.org_certificate_asset_id.maybe(organization_wallet)

        is_verified = verified_exists and verified == UInt64(1)
        if not asset_exists:
            asset_id = UInt64(0)

        return is_verified, asset_id
