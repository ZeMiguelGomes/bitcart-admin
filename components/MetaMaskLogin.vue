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
      <v-card v-if="screen !== 'modal'">
        <v-card-text v-if="address" class="mt-4 text-center">
          Connected with address: {{ formatAddress }}
          <br />
          Chain ID: {{ chainId }}
        </v-card-text>
      </v-card>
      <div class="d-flex flex-wrap mt-4 justify-center w-5/6">
        <template v-if="isLoading">
          <v-progress-circular indeterminate color="primary" />
        </template>
        <template v-else-if="NFT && NFT.length > 0">
          <NFTCard
            v-for="(nft, key) in NFT"
            :key="key"
            :nft="nft"
            :chain-id="chainId"
            :screen="screen"
            class="mx-4 my-4"
            :class="[
              screen === 'modal' && nft.id === selectedCardId ? 'selected' : '',
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
          <v-snackbar
            v-model="showSnackbar"
            :timeout="2500"
            :color="snackbarColor"
          >
            {{ snackbarMessage }}
          </v-snackbar>
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
    if (this.screen === "admin") {
      // This is inside the admin dashboard
      const userAddress = sessionStorage.getItem("userAddress")
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
    }

    // Listen for changes in accounts
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        console.log("Change Wallet")
        this.connectWallet()
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
      if (this.screen === "admin") {
        // Gets all the NFT in the wallet
        url = `/vouchers/nft/?userAddress=${this.address}&chainID=${this.chainId}`
      } else {
        // Gets only the NFT that the client can use in the checkout
        const encodedLineItems = encodeURIComponent(
          JSON.stringify(this.lineItems)
        )
        url = `/vouchers/nftClient/?userAddress=${this.address}&chainID=${this.chainId}&storeID=${this.invoice.store_id}&lineItems=${encodedLineItems}`
      }
      await this.$axios
        .get(url)
        .then((resp) => {
          // Get all the data (invoices, wallets, stores) to display in the table
          this.NFT = resp.data?.ownedNfts
          this.allNFT = [...resp.data?.ownedNfts]
          this.errorLogin = false
          this.isLoading = false
        })
        .catch((err) => {
          this.errorLogin = true
          console.log("Error", err.response)
        })
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
      // Show on the scree only the voucher that he initially choose
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
</style>
