from algopy import ARC4Contract, Account, BoxMap, Global, String, Txn, UInt64, subroutine
from algopy.arc4 import abimethod


class AlertEngine(ARC4Contract):
    low_threshold: UInt64
    medium_threshold: UInt64
    high_threshold: UInt64

    def __init__(self) -> None:
        self.alert_count = BoxMap(Account, UInt64, key_prefix="ae_count_")
        self.latest_score = BoxMap(Account, UInt64, key_prefix="ae_score_")
        self.latest_severity = BoxMap(Account, String, key_prefix="ae_sev_")
        self.latest_reason = BoxMap(Account, String, key_prefix="ae_reason_")
        self.low_threshold = UInt64(30)
        self.medium_threshold = UInt64(60)
        self.high_threshold = UInt64(80)

    @abimethod()
    def configure_thresholds(self, low: UInt64, medium: UInt64, high: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can configure"
        assert low < medium and medium < high and high <= UInt64(100), "Invalid threshold order"
        self.low_threshold = low
        self.medium_threshold = medium
        self.high_threshold = high

    @abimethod()
    def emit_alert(self, wallet: Account, score: UInt64, reason: String) -> String:
        assert Txn.sender == Global.creator_address, "Only creator can emit alerts"
        assert score <= UInt64(100), "Score out of range"
        assert reason.bytes.length > UInt64(0), "Reason required"

        count, exists = self.alert_count.maybe(wallet)
        self.alert_count[wallet] = count + UInt64(1) if exists else UInt64(1)
        self.latest_score[wallet] = score
        self.latest_reason[wallet] = reason

        severity = self._severity_from_score(score)
        self.latest_severity[wallet] = severity
        return severity

    @abimethod(readonly=True)
    def get_alert_count(self, wallet: Account) -> UInt64:
        count, exists = self.alert_count.maybe(wallet)
        if exists:
            return count
        return UInt64(0)

    @abimethod(readonly=True)
    def get_latest_alert(self, wallet: Account) -> tuple[UInt64, String, String]:
        score, score_exists = self.latest_score.maybe(wallet)
        severity, severity_exists = self.latest_severity.maybe(wallet)
        reason, reason_exists = self.latest_reason.maybe(wallet)

        if not score_exists or not severity_exists or not reason_exists:
            return UInt64(0), String("none"), String("")
        return score, severity, reason

    @subroutine
    def _severity_from_score(self, score: UInt64) -> String:
        if score <= self.low_threshold:
            return String("low")
        if score <= self.medium_threshold:
            return String("medium")
        if score <= self.high_threshold:
            return String("high")
        return String("critical")
