<template>
  <v-container class="d-flex flex-column justify-center align-center">
    <div>
      <v-btn
        v-if="!address || errorLogin == true"
        :color="errorLogin ? 'red' : 'primary'"
        dark
        large
        block
        @click="connectWallet"
      >
        <v-img
          :src="`${STATIC_PATH}/metamask.svg`"
          height="40"
          width="40"
          class="mr-2"
        />
        <template v-if="errorLogin">Error Authenticating</template>
        <template v-else> Connect Wallet </template>
      </v-btn>
    </div>
    <div v-if="!errorLogin">
      <v-card>
        <v-card-text v-if="address" class="mt-4 text-center">
          Connected with address: {{ formatAddress }}
          <br />
          Chain ID: {{ chainId }}
        </v-card-text>
      </v-card>
      <div class="d-flex flex-wrap mt-4 justify-center w-5/6">
        <template v-if="NFT && NFT.length > 0">
          <NFTCard
            v-for="(nft, key) in NFT"
            :key="key"
            :nft="nft"
            :chain-id="chainId"
            class="mx-4 my-4"
          />
        </template>
        <template v-else-if="providerLoaded == true">
          <p class="text-h6 font-weight-bold">No vouchers available</p>
        </template>
      </div>
    </div>
  </v-container>
</template>

<script>
import NFTCard from "@/components/NFTCard.vue"
export default {
  name: "MyComponent",
  components: {
    NFTCard,
  },
  data() {
    return {
      address: null,
      chainId: "",
      providerLoaded: false, // add a flag to track if the script has loaded
      NFT: [], // Store the info fetched from API
      errorLogin: false, // Checks if login with Metamask Was successfull
    }
  },
  head() {
    return {
      script: [
        {
          src: `https://unpkg.com/@metamask/detect-provider/dist/detect-provider.min.js`,
        },
        {
          src: `https://unpkg.com/web3@latest/dist/web3.min.js`,
        },
      ],
    }
  },
  computed: {
    formatAddress() {
      if (this.address) {
        const firstFour = this.address.slice(0, 6)
        const lastFour = this.address.slice(-4)
        return `${firstFour}...${lastFour}`
      } else {
        return ""
      }
    },
  },
  async mounted() {
    const userAddress = localStorage.getItem("userAddress")
    if (userAddress && typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" })
        this.address = userAddress
        const chainId = await window.ethereum.networkVersion
        this.chainId = chainId
        this.providerLoaded = true
      } catch (error) {
        console.error(error)
      }
      await this.connectAPI()
    }

    // Listen for changes in accounts
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        this.connectWallet()
      } else {
        this.address = null
      }
    })

    // Listen for changes in network
    window.ethereum.on("chainChanged", (chainId) => {
      this.connectWallet()
    })
  },
  methods: {
    async loadProvider() {
      if (typeof window.ethereum !== "undefined") {
        try {
          // This method opens metamask
          await window.ethereum.request({ method: "eth_requestAccounts" })
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          })
          const chainId = await window.ethereum.networkVersion

          this.address = accounts[0]
          this.chainId = chainId
          this.providerLoaded = true
          // Adds user address to local storage
          localStorage.setItem("userAddress", this.address)
        } catch (error) {
          console.error(error)
        }
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },

    async connectWallet() {
      await this.loadProvider()
      // this runs after getying the user's address and ChainId
      await this.connectAPI()
    },

    async connectAPI() {
      const url = `/vouchers/nft/?userAddress=${this.address}&chainID=${this.chainId}`
      await this.$axios
        .get(url)
        .then((resp) => {
          // Get all the data (invoices, wallets, stores) to display in the table
          this.NFT = resp.data?.ownedNfts
          this.errorLogin = false
          console.log(this.NFT)
        })
        .catch((err) => {
          this.errorLogin = true
          console.log("Error", err.response)
        })
    },
  },
}
</script>

<style scoped>
button:focus {
  outline: none;
}
</style>
