from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64
from algopy.arc4 import abimethod


class CertificateManager(ARC4Contract):
    next_certificate_id: UInt64

    def __init__(self) -> None:
        self.certificate_owner = BoxMap(UInt64, Account, key_prefix="cm_owner_")
        self.certificate_metadata = BoxMap(UInt64, String, key_prefix="cm_meta_")
        self.certificate_expiry = BoxMap(UInt64, UInt64, key_prefix="cm_exp_")
        self.certificate_active = BoxMap(UInt64, UInt64, key_prefix="cm_act_")
        self.next_certificate_id = UInt64(1)

    @abimethod()
    def issue_certificate(
        self,
        wallet: Account,
        metadata_hash: String,
        expires_at_round: UInt64,
    ) -> UInt64:
        assert Txn.sender == Global.creator_address, "Only creator can issue certificates"
        assert metadata_hash.bytes.length > UInt64(0), "Metadata hash required"
        assert expires_at_round > UInt64(0), "Expiry round must be > 0"

        cert_id = self.next_certificate_id
        self.certificate_owner[cert_id] = wallet
        self.certificate_metadata[cert_id] = metadata_hash
        self.certificate_expiry[cert_id] = expires_at_round
        self.certificate_active[cert_id] = UInt64(1)
        self.next_certificate_id = cert_id + UInt64(1)

        return cert_id

    @abimethod()
    def revoke_certificate(self, certificate_id: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can revoke certificates"
        assert certificate_id in self.certificate_active, "Certificate not found"
        self.certificate_active[certificate_id] = UInt64(0)

    @abimethod(readonly=True)
    def verify_certificate(self, certificate_id: UInt64, wallet: Account) -> bool:
        active, active_exists = self.certificate_active.maybe(certificate_id)
        owner, owner_exists = self.certificate_owner.maybe(certificate_id)
        expiry, expiry_exists = self.certificate_expiry.maybe(certificate_id)

        if not active_exists or not owner_exists or not expiry_exists:
            return False
        if active != UInt64(1):
            return False
        if owner != wallet:
            return False
        return Global.round <= expiry

    @abimethod(readonly=True)
    def get_certificate_metadata(self, certificate_id: UInt64) -> String:
        metadata, exists = self.certificate_metadata.maybe(certificate_id)
        if exists:
            return metadata
        return String("")

    @abimethod(readonly=True)
    def is_certificate_active(self, certificate_id: UInt64) -> bool:
        active, exists = self.certificate_active.maybe(certificate_id)
        return exists and active == UInt64(1)
