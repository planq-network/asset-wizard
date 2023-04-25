import { ethToPlanq, planqToEth } from './bech32-utils.js'
import {ethers, VoidSigner, providers} from './ethers-5.7.esm.min.js'

export class KeplrProvider extends providers.JsonRpcProvider {
  keplrAvailable = false
  chainId = 'planq_7070-2'
  keplrSigner = null
  constructor(url, network, chainId, overrideMetamask) {
    super(url, network)

    this.chainId = chainId
    if (window.keplr) {
      this.keplrAvailable = true
    }
    this.attach(overrideMetamask)
    this.checkNetwork()
  }

  // attach the provider to window.ethereum in case MetaMask is not available
  attach(overrideMetamask) {
    if (!window.ethereum || overrideMetamask) {
      window.ethereum = this
    }
  }

  // check current network and switch
  async checkNetwork() {
    if (this.keplrAvailable) {
      const chainId = 'planq_7070-2'
      await this.addPlanqChain()
      await window.keplr.enable(chainId)
    }
  }

  async getAccountsBech32() {
    const offlineSigner = window.keplr.getOfflineSigner(this.chainId)
    const accounts = await offlineSigner.getAccounts()
    return accounts[0].address
  }

  async getAccounts() {
    const offlineSigner = window.keplr.getOfflineSigner(this.chainId)
    const accounts = await offlineSigner.getAccounts()
    return { 0: planqToEth(accounts[0].address) }
  }

  // Compatibility for window.ethereum.request - only used if MetaMask is not available
  async request(req) {
    switch (req.method) {
      case 'eth_requestAccounts':
        return this.getAccounts()
      default:
        return this.send(req.method, req.params)
    }
    return this.send(req.method, req.params)
  }

  async getSigner(index) {
    let account = await this.getAccounts()
    if (!this.keplrSigner) {
      this.keplrSigner = new KeplrSigner(account[0], this)
    }
    return this.keplrSigner
  }

  async addPlanqChain() {
    await window.keplr.experimentalSuggestChain({
      chainId: 'planq_7070-2',
      chainName: 'Planq',
      rpc: 'https://rpc.planq.network',
      rest: 'https://rest.planq.network',
      bip44: {
        coinType: 60,
      },
      bech32Config: {
        bech32PrefixAccAddr: 'plq',
        bech32PrefixAccPub: 'plq' + 'pub',
        bech32PrefixValAddr: 'plq' + 'valoper',
        bech32PrefixValPub: 'plq' + 'valoperpub',
        bech32PrefixConsAddr: 'plq' + 'valcons',
        bech32PrefixConsPub: 'plq' + 'valconspub',
      },
      currencies: [
        {
          coinDenom: 'PLANQ',
          coinMinimalDenom: 'aplanq',
          coinDecimals: 18,
          coinGeckoId: 'planq',
        },
      ],
      feeCurrencies: [
        {
          coinDenom: 'PLANQ',
          coinMinimalDenom: 'aplanq',
          coinDecimals: 18,
          coinGeckoId: 'planq',
          gasPriceStep: {
            low: 25000000000,
            average: 25000000000,
            high: 40000000000,
          },
        },
      ],
      stakeCurrency: {
        coinDenom: 'PLANQ',
        coinMinimalDenom: 'aplanq',
        coinDecimals: 18,
        coinGeckoId: 'planq',
      },
      features: ['ibc-transfer', 'ibc-go', 'eth-address-gen', 'eth-key-sign'],
    })
  }
}

export class KeplrSigner extends VoidSigner {
  keplrInstance = null
  constructor(address, provider) {
    super(address, provider)
    this.keplrInstance = provider
  }
  async signTransaction(transaction) {
    const account = await this.keplrInstance.getAccountsBech32()
    transaction.gasLimit = transaction.gasLimit.mul(ethers.BigNumber.from(2))
    return await window.keplr.signEthereum(
      this.keplrInstance.chainId,
      account,
      JSON.stringify(transaction),
      'transaction',
    )
  }

  async signMessage(message) {
    const account = await this.keplrInstance.getAccountsBech32()
    return await window.keplr.signEthereum(
      this.keplrInstance.chainId,
      account,
      JSON.stringify(message),
      'message',
    )
  }
}
