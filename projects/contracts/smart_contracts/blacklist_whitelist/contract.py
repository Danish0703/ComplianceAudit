from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64
from algopy.arc4 import abimethod


class BlacklistWhitelist(ARC4Contract):
    def __init__(self) -> None:
        self.blacklist = BoxMap(Account, UInt64, key_prefix="bw_black_")
        self.whitelist = BoxMap(Account, UInt64, key_prefix="bw_white_")

    @abimethod()
    def set_blacklist_status(self, wallet: Account, blocked: bool) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can update blacklist"
        self.blacklist[wallet] = UInt64(1) if blocked else UInt64(0)

    @abimethod()
    def set_whitelist_status(self, wallet: Account, approved: bool) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can update whitelist"
        self.whitelist[wallet] = UInt64(1) if approved else UInt64(0)

    @abimethod(readonly=True)
    def is_blacklisted(self, wallet: Account) -> bool:
        status, exists = self.blacklist.maybe(wallet)
        return exists and status == UInt64(1)

    @abimethod(readonly=True)
    def is_whitelisted(self, wallet: Account) -> bool:
        status, exists = self.whitelist.maybe(wallet)
        return exists and status == UInt64(1)

    @abimethod(readonly=True)
    def get_wallet_status(self, wallet: Account) -> String:
        black, black_exists = self.blacklist.maybe(wallet)
        white, white_exists = self.whitelist.maybe(wallet)

        if black_exists and black == UInt64(1):
            return String("blacklisted")
        if white_exists and white == UInt64(1):
            return String("whitelisted")
        return String("unlisted")
