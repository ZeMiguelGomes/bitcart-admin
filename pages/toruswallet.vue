<template>
  <v-container>
    <p class="text-h4">Torus Wallet</p>
    <v-btn @click="connectWithTorus">Connect with Torus Wallet</v-btn>
    <div v-if="connected">
      <p>Connected Address: {{ connectedAddress }}</p>
      <p>Balance: {{ balance }} MATIC</p>
    </div>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      connected: false,
      connectedAddress: "",
      balance: 0,
      web3: null,
    }
  },
  head() {
    return {
      script: [
        {
          src: `https://cdn.jsdelivr.net/npm/@toruslabs/torus-embed`,
        },
        {
          src: `https://unpkg.com/web3@latest/dist/web3.min.js`,
        },
      ],
    }
  },
  watch: {
    connectedAddress() {
      this.fetchBalance()
    },
  },
  methods: {
    async connectWithTorus() {
      // eslint-disable-next-line no-undef
      const torus = new Torus()
      await torus.init({
        network: {
          host: "mumbai", // specify the desired network
          chainId: 80001,
          networkName: "Mumbai Test Network", // default: Main Ethereum Network
        },
      })

      await torus.login() // initiate the login flow

      // eslint-disable-next-line no-undef
      const web3 = new Web3(torus.provider) // create a Web3 instance with Torus provider
      this.web3 = web3

      // Use the web3 instance for further interactions with the blockchain

      // Example: Fetch the connected account address
      const accounts = await web3.eth.getAccounts()
      const address = accounts[0]
      this.connectedAddress = address
      this.connected = true

      await this.fetchBalance()
    },
    async fetchBalance() {
      if (!this.connected) return

      const balance = await this.web3.eth.getBalance(this.connectedAddress)
      this.balance = this.web3.utils.fromWei(balance, "ether")
    },
  },
}
</script>
