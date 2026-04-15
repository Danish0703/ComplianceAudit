import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.txn_validator.txn_validator_client import (
    TxnValidatorClient,
    TxnValidatorFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def txn_validator_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> TxnValidatorClient:
    factory = algorand_client.client.get_typed_app_factory(
        TxnValidatorFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_validate_transaction_returns_reasonable_score(
    algorand_client: AlgorandClient,
    txn_validator_client: TxnValidatorClient,
    deployer: SigningAccount,
) -> None:
    receiver = algorand_client.account.random()

    result = txn_validator_client.send.validate_transaction(
        args=(deployer.address, receiver.address, 500_000)
    )

    assert result.abi_return is not None
    assert 0 <= result.abi_return <= 100


def test_wallet_not_blocked_by_default(
    txn_validator_client: TxnValidatorClient,
    deployer: SigningAccount,
) -> None:
    result = txn_validator_client.send.is_wallet_blocked(args=(deployer.address,))
    assert result.abi_return is False
