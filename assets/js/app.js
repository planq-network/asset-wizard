import { contractABIs, contractByteCodes } from './contracts.js'
import { ethers } from './ethers-5.7.esm.min.js'
import { KeplrProvider, KeplrSigner } from './keplr-provider.js';
import { LeapProvider, LeapSigner } from './leap-provider.js';

var web3,
    provider,
    isMainNetwork,
    isMetaMaskLocked,
    address;

var walletProvider = undefined
var isMetamask = false;
var metamaskStatus = $('#metamask-status');
var accountAddress = $('#current-address');
var currentNetwork = $('#current-network');
var metamaskLocked = $('#metamask-locked');
var metamaskUnlocked = $('#metamask-unlocked');

var assetForm = $('#asset-form');
var assetFormInput = $('#asset-form :input');
//disable all form input fields
assetFormInput.prop("disabled", true);

async function getAccount() {
    try {
        if (web3 && walletProvider) {
            const account = (
                await window.ethereum.request({ method: 'eth_requestAccounts' })
            )[0]
            return (
                account ||
                (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0]
            )
        }

        return []
    } catch (error) {
        console.log(error)
        throw new Error(
            'Could not unlock an account. Consider installing Status on your mobile or Metamask extension',
        )
    }
}

async function selectWeb3Provider(i){
    switch(i) {
        case 0:
            isMetamask = false
            web3 = new LeapProvider(
                'https://evm-rpc.planq.network:443',
                {
                    chainId: 7070,
                    name: 'Planq',
                },
                'planq_7070-2',
                true,
            )
            break;
        case 1:
            isMetamask = false
            web3 = new KeplrProvider(
                'https://evm-rpc.planq.network:443',
                {
                    chainId: 7070,
                    name: 'Planq',
                },
                'planq_7070-2',
                true,
            )
            break;
        case 2:
            web3 = new ethers.providers.Web3Provider(window.ethereum)
            isMetamask = true;
            break;
        default:
            web3 = new ethers.providers.Web3Provider(window.ethereum)
            isMetamask = true;
            break;
    }

    if (web3) {
        start()
    } else {
        console.log('No web3 provider detected || web3 not exits');
        metamaskStatus.html('You do not appear to be connected to any Ethereum network. To use this service and deploy your contract, we recommend using the <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en">MetaMask</a> plugin for Google Chrome, which allows your web browser to connect to an Ethereum network.').show();
    }
}

window.addEventListener('load', async () => {
    $('#wallet-login').on('click', function(e) {
        e.preventDefault()

        $('#walletSelect').modal("toggle");
    });

    $('#wallet-logout').on('click', function(e) {
        e.preventDefault()
    walletProvider = undefined;
    $('#walletSelect').modal("toggle");
    });
    $('#metamaskWallet').on('click', async function(e) {
        e.preventDefault()
        walletProvider = "metamask"
        await selectWeb3Provider(2);
    });
    $('#keplrWallet').on('click', async function(e) {
        e.preventDefault()
        walletProvider = "keplr"
        await selectWeb3Provider(1);
    });
    $('#leapWallet').on('click', async function(e) {
        e.preventDefault()
        walletProvider = "leap"
        await selectWeb3Provider(0);
    });


    // New ethereum provider
});

function handleAccountsChanged(accounts) {
    // Handle the new accounts, or lack thereof.
    // "accounts" will always be an array, but it can be empty.
}

function handleChainChanged(_chainId) {
    // Handle the new chain.
    // Correctly handling chain changes can be complicated.
    // We recommend reloading the page unless you have good reason not to.
    window.location.reload();
}

function metamaskEvents() {
    ethereum.on('accountsChanged', handleAccountsChanged)
        .on('chainChanged', handleChainChanged)
        .on('connect', function (a, b, c) {
            debugger;
        })
        .on('disconnect', function (a, b, c) {
            debugger;
        })
        .on('message', function (a, b, c) {
            debugger;
        });
}

function start() {
    if (isMetamask) {
        provider = web3.provider;
    } else {
        provider = web3;
    }

    assetFormInput.prop("disabled", false);
    metamaskStatus.hide()
    // metamaskEvents()
    getEthNetworkId()
        .then(function (networkId) {
            if (networkId == '7070') {
                isMainNetwork = true;
                currentNetwork.text('You are currently on Mainnet').show();
            } else
                currentNetwork.text('Your current network id is ' + networkId).show();
        });

    setInterval(function () {
        isLocked()
            .then(function (isLocked) {
                if (isLocked) {
                    isMetaMaskLocked = true;
                    metamaskUnlocked.hide();
                    accountAddress.hide();
                    metamaskLocked.show();
                    assetFormInput.prop("disabled", true);
                    throw Error("Metamask Locked");
                }
                metamaskUnlocked.show();
                metamaskLocked.hide();

                return getAccount()
            })
            .then(function (account) {
                if (account.length > 0) {
                    if (isMetaMaskLocked) {
                        isMetaMaskLocked = false;
                        assetFormInput.prop("disabled", false);
                    }
                    address = account;
                    return getBalance(account);
                }
            })
            .then(function (balance) {
                accountAddress.html(address + '<br/>Available ' + balance + ' PLQ</br>').show();
            });
    }, 1000);
}

function sendSync(params) {
    var defer = $.Deferred();
    provider.send(params.method, params.params, function (err, result) {
        if (err)
            return defer.reject(err.json());
        if (result['error'])
            return defer.reject(result['error']);
        defer.resolve(result)
    }
    );
    return defer.promise();
}

async function getEthNetworkId() {
    if(isMetamask) {
        return sendSync({ method: 'net_version', params: [] })
            .then(function (result) {
                return result['result'];
            })
    } else {
        const currentNetwork = await web3.getNetwork();
        return currentNetwork.chainId;
    }
}

function requestAccounts() {
    return sendSync({ method: 'eth_requestAccounts' })
        .then(function (result) {
            return result['result'];
        })
        .fail(function (err) {
            return err;
        })
}

async function getBalance(address) {
    if(isMetamask) {
        requestAccounts();
        return sendSync({ method: 'eth_getBalance', params: [address, "latest"] })
            .then(function (result) {
                return ethers.utils.formatEther(result['result']);
            })
            .fail(function (err) {
                return err;
            })
    } else {
        const balance = await provider.getBalance(address);
        return ethers.utils.formatEther(balance)
    }
}

function isLocked() {
    return getAccount()
        .then(function (accounts) {
            return accounts.length <= 0;
        })
}

var initialSupply = $('#total-supply').val();
var tokenName = $('#name').val();
var decimalUnits = $('#decimals').val();
var tokenSymbol = $('#symbol').val();
var selectedType = 'ERC20';

function updateTokenValues() {
    initialSupply = $('#total-supply').val();
    tokenName = $('#name').val();
    decimalUnits = $('#decimals').val();
    tokenSymbol = $('#symbol').val();

    switch($('#type').find(':selected').val()) {
        case '0':
            selectedType = 'ERC20';
            break;
        case '1':
            selectedType = 'ERC20MintBurn'
            break;
        case '2':
            selectedType = 'ERC20MintBurnFlashMint'
            break;
        default:
            selectedType = 'ERC20';
            break;
    }

}
function validateForm() {
    updateTokenValues();
    var valid = true;

    if (tokenName === '') {
        alert('name can\'t be blank')
        valid = false;
    } else if (tokenSymbol === '') {
        alert('symbol can\'t be blank')
        valid = false;
    } else if (decimalUnits === '') {
        alert('decimals can\'t be blank')
        valid = false;
    } else if (initialSupply === '') {
        alert('totalSupply can\'t be blank')
        valid = false;
    }
    return valid;
}
//call function on form submit
assetForm.submit(async function (e) {
    //prevent the form from actually submitting.
    e.preventDefault();

    if (validateForm()) {
        //disable all form input fields
        assetFormInput.prop("disabled", true);
        const signer = await web3.getSigner();
        const factory = new ethers.ContractFactory(contractABIs[selectedType], contractByteCodes[selectedType], signer);

        statusText.innerHTML = 'Waiting for contract to be deployed...';
        const contract = await factory.deploy(tokenName, tokenSymbol, decimalUnits, initialSupply)
        try {
            const transactionHash = await contract.deployTransaction.wait();

            if (isMainNetwork) {
                statusText.innerHTML = '<p align="center">Contract deployment is in progress - please be patient. If nothing happens for a while check if there\'s any errors in the console (hit F12).<br> <strong>Transaction hash: </strong><br> <a href="https://evm.planq.network/tx/' + transactionHash + '" target="_blank">' + transactionHash + '</a></p>'
            } else {
                statusText.innerHTML = 'Contract deployment is in progress - please be patient. If nothing happens for a while check if there\'s any errors in the console (hit F12). Transaction hash: ' + transactionHash
            }
        } catch (error) {
            console.log(error);
            return;
        }

        console.log('Deployed Contract Address : ', contract.address);
        var newContractAddress = contract.address;
        if (isMainNetwork) {
            statusText.innerHTML = 'Transaction  mined! Contract address: <a href="https://evm.planq.network/address/' + newContractAddress + '" target="_blank">' + newContractAddress + '</a>'
        } else {
            statusText.innerHTML = 'Contract deployed at address <b>' + newContractAddress + '</b> - keep a record of this.'
        }
        }
});

function nthRoot(x, n) {
    if (x < 0 && n % 2 != 1) return NaN; // Not well defined
    return (x < 0 ? -1 : 1) * Math.pow(Math.abs(x), 1 / n);
}

$("#decimals").keypress(function (e) {
    //if the letter is not digit then display error and don't type anything
    if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
        //display error message
        $("#decimals-error-msg").html("Digits Only").show().fadeOut("slow");
        return false;
    }
});

$("#total-supply").keypress(function (e) {
    //if the letter is not digit then display error and don't type anything
    if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
        //display error message
        $("#total-supply-error-msg").html("Digits Only").show().fadeOut("slow");
        return false;
    }
});
