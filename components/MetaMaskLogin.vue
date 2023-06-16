<template>
  <v-container class="d-flex flex-column">
    <div
      v-if="isPageLoading && screen !== 'modal'"
      class="d-flex justify-center mt-5 mb-5"
    >
      <v-progress-circular
        indeterminate
        size="40"
        color="primary"
      ></v-progress-circular>
    </div>
    <div v-else>
      <div class="d-flex justify-center">
        <v-btn
          v-if="!address || errorLogin == true"
          :color="errorLogin ? 'red' : 'primary'"
          dark
          large
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
        <div v-if="screen !== 'modal'" class="mt-2">
          <v-select
            v-if="address"
            v-model="selectedAddress"
            :items="ethWalletAddress"
            item-text="xpub"
            label="Select Address"
            :hint="`${selectedAddress.name}`"
            :style="{ 'max-width': '350px' }"
            persistent-hint
            outlined
            dense
            @change="onAddressChange"
          ></v-select>
        </div>

        <div class="d-flex flex-wrap mt-10 justify-center w-5/6 mb-10">
          <template v-if="isLoading">
            <v-progress-circular
              indeterminate
              size="32"
              color="primary"
            ></v-progress-circular>
          </template>
          <template v-else-if="NFT && NFT.length > 0">
            <NFTCard
              v-for="(nft, key) in NFT"
              :key="key"
              :nft="nft"
              :chain-id="chainId"
              :screen="screen"
              :stores="stores"
              class="mx-4 my-4"
              :class="[
                screen === 'modal' && nft.id === selectedCardId
                  ? 'selected'
                  : '',
                screen === 'modal' ? '' : 'flex-column',
              ]"
              @cardSelected="onCardSelected"
            />
            <div v-if="screen === 'modal'">
              <v-btn
                v-if="!showChangeOptionButton"
                color="primary"
                :disabled="disableSubmitVoucher"
                @click="submitNFT"
              >
                Choose Voucher
              </v-btn>
              <div v-if="showChangeOptionButton">
                <v-btn
                  width="150px"
                  color="success"
                  :disabled="disableConfirmVoucher"
                  @click="confirmVoucher"
                  >Confirm</v-btn
                >
                <v-btn
                  width="150px"
                  color="warning"
                  :disabled="disableChangeVoucherButton"
                  @click="resetSelection"
                  >Change Voucher</v-btn
                >
              </div>
            </div>
          </template>
          <template v-else-if="providerLoaded == true">
            <p class="text-h6 font-weight-bold">No vouchers available</p>
          </template>
        </div>
      </div>
      <v-snackbar v-model="showSnackbar" :timeout="2500" :color="snackbarColor">
        {{ snackbarMessage }}
      </v-snackbar>
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
  props: {
    screen: {
      type: String,
      default: "",
    },
    lineItems: {
      type: Array,
      default() {
        return []
      },
    },
    invoice: {
      type: Object,
      default() {
        return {}
      },
    },
  },
  data() {
    return {
      address: null,
      chainId: "",
      providerLoaded: false, // add a flag to track if the script has loaded
      allNFT: [], // List with all the NFT (immutable)
      NFT: [], // Store the info fetched from API
      errorLogin: false, // Checks if login with Metamask Was successfull
      selectedNFT: null, // To store the selected NFT voucher
      selectedCardId: null,
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "error",
      showChangeOptionButton: false, // Reset of the Voucher options
      disableSubmitVoucher: false, // Disable the submit voucher
      disableConfirmVoucher: true,
      disableChangeVoucherButton: false, // Disable the change voucher button
      isChangeButtonClicked: false, // Checks if the change voucher button is clicked
      isLoading: false, // Loading animation
      stores: null, // Gets all the stores
      ethWalletAddress: null, // Gets the ethWallet address
      isPageLoading: true, // Inicial Loading state
    }
  },
  head() {
    return {
      script: [
        {
          src: `https://unpkg.com/@metamask/detect-provider/dist/detect-provider.min.js`,
        },
        {
          src: `https://unpkg.com/web3@1/dist/web3.min.js`,
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
    selectedAddress: {
      get() {
        const lowercaseAddress = this.address.toLowerCase()
        return this.ethWalletAddress.find(
          (wallet) => wallet.xpub.toLowerCase() === lowercaseAddress
        )
      },
      set(value) {
        this.address = value.toLowerCase()
      },
    },
  },
  async mounted() {
    if (this.screen === "admin") {
      // This is inside the admin dashboard
      const userAddress = sessionStorage.getItem("userAddress")

      await this.fetchStores()
      await this.fetchEthereumWallets()
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
        this.isLoading = true
        await this.connectAPI()
      }
      this.isPageLoading = false
    }

    // Listen for changes in accounts
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        const account = accounts[0]
        if (this.screen === "admin") {
          const foundWallet = this.ethWalletAddress.find(
            (wallet) => wallet.xpub.toLowerCase() === account
          )
          if (foundWallet) {
            console.log("Está presente")
            this.connectWallet()
          }
        }
      } else {
        this.address = null
      }
    })

    this.$on("confirm-voucher-button", (blockVoucherTab) => {
      this.disableConfirmVoucher = blockVoucherTab
      this.disableChangeVoucherButton = !blockVoucherTab
    })

    this.$on("show-error", (message) => {
      this.showError(message)
    })
  },
  methods: {
    async fetchStores() {
      await this.$axios
        .get("/stores")
        .then((response) => {
          // Save store information to component data
          this.stores = response.data.result.map((store) => {
            return {
              id: store.id,
              name: store.name,
            }
          })
        })
        .catch((error) => {
          console.error(error)
        })
    },
    async fetchEthereumWallets() {
      await this.$axios
        .get("/wallets/ethwallet")
        .then((response) => {
          // Save store information to component data
          this.ethWalletAddress = response.data
        })
        .catch((error) => {
          console.error(error)
        })
    },
    async onAddressChange(value) {
      this.isLoading = true
      this.address = value
      sessionStorage.setItem("userAddress", value)

      await this.connectAPI()
    },
    async loadProvider() {
      if (typeof window.ethereum !== "undefined") {
        try {
          // This method opens metamask
          await window.ethereum.request({ method: "eth_requestAccounts" })
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          })
          // The chain ID has the be always the same MATIC for the vouchers
          const chainId = "80001"

          this.address = accounts[0]
          this.chainId = chainId
          this.providerLoaded = true
          // Adds user address to local storage
          sessionStorage.setItem("userAddress", this.address)
        } catch (error) {
          console.error(error)
        }
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },

    async connectWallet() {
      this.isLoading = true
      await this.loadProvider()
      // this runs after getying the user's address and ChainId
      await this.connectAPI()
    },
    async connectAPI() {
      let url = ""
      let headers = {} // Initialize headers object

      if (this.screen === "admin") {
        // Gets all the NFT in the wallet
        url = `/vouchers/nft/?userAddress=${this.address}&chainID=${this.chainId}`
      } else {
        // Check first if the invoice had a voucher selected
        console.log(this.invoice)

        // Gets only the NFT that the client can use in the checkout
        const encodedLineItems = encodeURIComponent(
          JSON.stringify(this.lineItems)
        )
        url = `/vouchers/nftClient/?userAddress=${this.address}&chainID=${this.chainId}&storeID=${this.invoice.store_id}&lineItems=${encodedLineItems}`
        headers = { "X-Website-URL": document.referrer }
      }
      await this.$axios
        .get(url, { headers })
        .then((resp) => {
          // Get all the data (invoices, wallets, stores) to display in the table
          this.NFT = resp.data?.ownedNfts
          console.log(resp.data?.ownedNfts)
          this.allNFT = [...resp.data?.ownedNfts]
          this.errorLogin = false
          this.isLoading = false
        })
        .catch((err) => {
          this.errorLogin = true
          console.log("Error", err.response)
        })
      if (this.screen === "modal") {
        this.checkVoucherInvoice()
      }
    },
    checkVoucherInvoice() {
      if (this.invoice.metadata && this.invoice.metadata.voucher) {
        // There was a voucher previsouly selected
        console.log(this.invoice.metadata.voucher)
        console.log(this.allNFT)

        const foundNFT = this.allNFT.find((nft) => {
          const decimalTokenId = parseInt(nft.id.tokenId, 16)
          return decimalTokenId === this.invoice.metadata.voucher
        })

        // Check if the invoice has a transaction hash
        const invoiceTx = this.invoice.tx_hashes
        if (foundNFT) {
          this.selectedNFT = foundNFT
          this.NFT = [this.selectedNFT]
          this.showChangeOptionButton = true
          if (invoiceTx && invoiceTx.length > 0) {
            console.log("invoice with transactions")
            this.disableConfirmVoucher = false
            this.disableChangeVoucherButton = true
          }
        } else {
          console.log("No matching NFT found")
        }
      } else {
        console.log("No voucher previously selected")
      }
    },
    onCardSelected(cardId) {
      if (cardId === this.selectedCardId && !this.showChangeOptionButton) {
        this.selectedCardId = null
      } else {
        this.selectedCardId = cardId
      }
    },
    showMessage(ok, text) {
      this.snackbarMessage = text
      this.snackbarColor = ok ? "success" : "error"
      this.showSnackbar = true
    },
    showError(text) {
      this.showMessage(false, text)
    },
    submitNFT() {
      this.selectedNFT = this.allNFT.find(
        (nft) => nft.id === this.selectedCardId
      )
      console.log(this.selectedNFT)

      // Show on the screen only the voucher that he initially choose
      if (this.selectedNFT) {
        this.NFT = [this.selectedNFT]
        this.showChangeOptionButton = true
        // this.showMessage(true, "Voucher Submited")

        if (!this.isChangeButtonClicked) {
          this.$emit(
            "choose-voucher",
            this.selectedNFT,
            () => window.ethereum.selectedAddress
          )
        } else {
          // Means that the Button to change voucher was pressed
          this.$emit("change-voucher", this.selectedNFT)
        }
      } else {
        this.showError("Choose a voucher to use")
      }
    },
    resetSelection() {
      this.showChangeOptionButton = false
      this.selectedCardId = null
      this.NFT = this.allNFT
      this.isChangeButtonClicked = true
    },
    confirmVoucher() {
      // Implement your logic to confirm the selection here
      // ...

      // Submit the actual voucher with a metamask transaction

      // this.showChangeOptionButton = false
      // this.disableSubmitVoucher = true
      console.log("voucher pressed")
      console.log(this.selectedNFT)
      this.$emit(
        "submit-voucher",
        this.selectedNFT,
        () => window.ethereum.selectedAddress
      )
    },
  },
}
</script>

<style scoped>
button:focus {
  outline: none;
}

.container {
  padding: 0;
}
</style>
