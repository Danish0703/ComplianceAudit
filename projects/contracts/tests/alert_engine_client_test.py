import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.alert_engine.alert_engine_client import (
    AlertEngineClient,
    AlertEngineFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def alert_engine_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> AlertEngineClient:
    factory = algorand_client.client.get_typed_app_factory(
        AlertEngineFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_emit_alert_increments_count(
    algorand_client: AlgorandClient,
    alert_engine_client: AlertEngineClient,
) -> None:
    wallet = algorand_client.account.random()

    severity = alert_engine_client.send.emit_alert(
        args=(wallet.address, 88, 'suspicious velocity')
    )
    count = alert_engine_client.send.get_alert_count(args=(wallet.address,))

    assert severity.abi_return in ['high', 'critical', 'medium', 'low']
    assert count.abi_return == 1
