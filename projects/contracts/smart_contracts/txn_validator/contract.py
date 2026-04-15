from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64
from algopy.arc4 import abimethod


class TxnValidator(ARC4Contract):
    max_amount_micro_algo: UInt64
    alert_threshold: UInt64

    def __init__(self) -> None:
        self.block_status = BoxMap(Account, UInt64, key_prefix="bl_")
        self.max_amount_micro_algo = UInt64(1_000_000_000)
        self.alert_threshold = UInt64(70)

    @abimethod()
    def configure(self, max_amount_micro_algo: UInt64, alert_threshold: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can configure"
        assert alert_threshold <= UInt64(100), "Threshold must be <= 100"
        self.max_amount_micro_algo = max_amount_micro_algo
        self.alert_threshold = alert_threshold

    @abimethod()
    def set_wallet_block_status(self, wallet: Account, blocked: bool) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can manage blocklist"
        self.block_status[wallet] = UInt64(1) if blocked else UInt64(0)

    @abimethod()
    def validate_transaction(self, sender: Account, receiver: Account, amount: UInt64) -> UInt64:
        assert sender != receiver, "Sender and receiver must differ"
        assert amount > UInt64(0), "Amount must be > 0"

        sender_blocked, sender_exists = self.block_status.maybe(sender)
        receiver_blocked, receiver_exists = self.block_status.maybe(receiver)

        if (sender_exists and sender_blocked == UInt64(1)) or (
            receiver_exists and receiver_blocked == UInt64(1)
        ):
            return UInt64(100)

        if amount > self.max_amount_micro_algo:
            return UInt64(85)

        # Scale amount into a baseline 0-100 score against configured maximum.
        scaled = (amount * UInt64(100)) // self.max_amount_micro_algo
        if scaled > UInt64(100):
            return UInt64(100)
        return scaled

    @abimethod(readonly=True)
    def is_wallet_blocked(self, wallet: Account) -> bool:
        status, exists = self.block_status.maybe(wallet)
        return exists and status == UInt64(1)

    @abimethod(readonly=True)
    def get_threshold(self) -> UInt64:
        return self.alert_threshold
