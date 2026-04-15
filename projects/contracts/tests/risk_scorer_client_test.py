import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.risk_scorer.risk_scorer_client import (
    RiskScorerClient,
    RiskScorerFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def risk_scorer_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> RiskScorerClient:
    factory = algorand_client.client.get_typed_app_factory(
        RiskScorerFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_calculate_composite_score(
    risk_scorer_client: RiskScorerClient,
) -> None:
    result = risk_scorer_client.send.calculate_composite_score(
        args=(20, 30, 40, 50, 60)
    )
    assert result.abi_return is not None
    assert 0 <= result.abi_return <= 100


def test_update_and_read_wallet_score(
    algorand_client: AlgorandClient,
    risk_scorer_client: RiskScorerClient,
) -> None:
    wallet = algorand_client.account.random()
    update = risk_scorer_client.send.update_wallet_score(args=(wallet.address, 72))
    assert update.abi_return == 72

    score = risk_scorer_client.send.get_wallet_score(args=(wallet.address,))
    level = risk_scorer_client.send.get_wallet_risk_level(args=(wallet.address,))

    assert score.abi_return == 72
    assert level.abi_return in ["high", "critical", "medium", "low"]
