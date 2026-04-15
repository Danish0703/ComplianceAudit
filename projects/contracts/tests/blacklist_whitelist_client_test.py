import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.blacklist_whitelist.blacklist_whitelist_client import (
    BlacklistWhitelistClient,
    BlacklistWhitelistFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def blacklist_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> BlacklistWhitelistClient:
    factory = algorand_client.client.get_typed_app_factory(
        BlacklistWhitelistFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_blacklist_status_updates(
    algorand_client: AlgorandClient,
    blacklist_client: BlacklistWhitelistClient,
) -> None:
    wallet = algorand_client.account.random()

    blacklist_client.send.set_blacklist_status(args=(wallet.address, True))
    is_blacklisted = blacklist_client.send.is_blacklisted(args=(wallet.address,))

    assert is_blacklisted.abi_return is True
