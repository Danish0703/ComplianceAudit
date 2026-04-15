import algokit_utils
import pytest
from algokit_utils import AlgoAmount, AlgorandClient, SigningAccount

from smart_contracts.artifacts.certificate_manager.certificate_manager_client import (
    CertificateManagerClient,
    CertificateManagerFactory,
)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address, min_spending_balance=AlgoAmount.from_algo(10)
    )
    return account


@pytest.fixture()
def certificate_manager_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> CertificateManagerClient:
    factory = algorand_client.client.get_typed_app_factory(
        CertificateManagerFactory, default_sender=deployer.address
    )

    client, _ = factory.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


def test_issue_and_verify_certificate(
    algorand_client: AlgorandClient,
    certificate_manager_client: CertificateManagerClient,
) -> None:
    wallet = algorand_client.account.random()

    issued = certificate_manager_client.send.issue_certificate(
        args=(wallet.address, 'ipfs://compliance-proof', 999999999)
    )

    certificate_id = issued.abi_return
    assert certificate_id is not None

    verified = certificate_manager_client.send.verify_certificate(
        args=(certificate_id, wallet.address)
    )
    assert verified.abi_return is True
