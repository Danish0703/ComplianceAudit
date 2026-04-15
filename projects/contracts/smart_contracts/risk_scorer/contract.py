from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64
from algopy.arc4 import abimethod


class RiskScorer(ARC4Contract):
    low_threshold: UInt64
    medium_threshold: UInt64
    high_threshold: UInt64

    def __init__(self) -> None:
        self.wallet_scores = BoxMap(Account, UInt64, key_prefix="rs_")
        self.low_threshold = UInt64(25)
        self.medium_threshold = UInt64(50)
        self.high_threshold = UInt64(75)

    @abimethod()
    def configure_thresholds(self, low: UInt64, medium: UInt64, high: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can configure"
        assert low < medium and medium < high and high <= UInt64(100), "Invalid threshold order"
        self.low_threshold = low
        self.medium_threshold = medium
        self.high_threshold = high

    @abimethod(readonly=True)
    def calculate_composite_score(
        self,
        fraud_score: UInt64,
        tx_history_score: UInt64,
        violation_score: UInt64,
        blacklist_score: UInt64,
        custom_rule_score: UInt64,
    ) -> UInt64:
        assert fraud_score <= UInt64(100), "Fraud score out of range"
        assert tx_history_score <= UInt64(100), "History score out of range"
        assert violation_score <= UInt64(100), "Violation score out of range"
        assert blacklist_score <= UInt64(100), "Blacklist score out of range"
        assert custom_rule_score <= UInt64(100), "Custom score out of range"

        weighted = (
            fraud_score * UInt64(30)
            + tx_history_score * UInt64(25)
            + violation_score * UInt64(20)
            + blacklist_score * UInt64(15)
            + custom_rule_score * UInt64(10)
        )
        return weighted // UInt64(100)

    @abimethod()
    def update_wallet_score(self, wallet: Account, score: UInt64) -> UInt64:
        assert Txn.sender == Global.creator_address, "Only creator can update score"
        assert score <= UInt64(100), "Score out of range"
        self.wallet_scores[wallet] = score
        return score

    @abimethod(readonly=True)
    def get_wallet_score(self, wallet: Account) -> UInt64:
        score, exists = self.wallet_scores.maybe(wallet)
        if exists:
            return score
        return UInt64(0)

    @abimethod(readonly=True)
    def get_wallet_risk_level(self, wallet: Account) -> String:
        score, exists = self.wallet_scores.maybe(wallet)
        if not exists:
            return String("unknown")
        if score <= self.low_threshold:
            return String("low")
        if score <= self.medium_threshold:
            return String("medium")
        if score <= self.high_threshold:
            return String("high")
        return String("critical")
