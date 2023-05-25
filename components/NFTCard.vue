<template>
  <div class="">
    <v-card
      class="nft-card d-flex justify-between"
      :class="[
        screen === 'modal' ? 'align-center' : 'flex-column',
        isSelected ? 'border-3 border-primary' : '',
      ]"
      outlined
      :width="screen === 'admin' ? '300px' : '300px'"
      :height="screen === 'admin' ? '750px' : 'auto'"
      @click="onCardClick"
    >
      <v-img
        :src="nftMedia"
        :alt="nft.title"
        :max-height="screen === 'admin' ? '300px' : '150px'"
        :width="screen === 'admin' ? '300px' : '150px'"
        class="rounded"
      ></v-img>

      <v-card-text>
        <template v-if="screen === 'modal'">
          <h2 class="text-xl font-weight-bold mb-1">{{ nft.title }}</h2>
          <p class="text-gray-600">{{ nft.description.substr(0, 150) }}</p>
        </template>
        <template v-else>
          <h2 class="text-xl font-weight-bold mb-1">{{ nft.title }}</h2>
          <p class="mb-2">
            Id: {{ nft.id.tokenId.substr(nft.id.tokenId.length - 4) }}
          </p>
          <p class="mb-4">{{ contractAddressShortened }}</p>
          <p class="text-gray-600">{{ nft.description.substr(0, 150) }}</p>
          <div
            v-for="attribute in filteredAttributes"
            :key="attribute.trait_type"
          >
            <template v-if="attribute.value !== undefined">
              <span class="font-weight-bold">{{ attribute.trait_type }}: </span>
              <span v-if="attribute.trait_type === 'Store'">
                {{ getStoreNames(attribute.value).join(", ") }}
              </span>
              <span v-else-if="attribute.trait_type === 'Product ID'">
                {{ attribute.value.join(", ") }}
              </span>
              <span v-else>{{ attribute.value }}</span>
            </template>
          </div>
        </template>
      </v-card-text>
      <v-card-actions
        v-if="screen === 'admin'"
        class="d-flex justify-center mt-auto"
      >
        <v-btn color="primary" @click="openBlockExplorer">
          View on Block Explorer
        </v-btn>
      </v-card-actions>
      <v-card-actions
        v-if="screen === 'admin'"
        class="d-flex justify-content mb-4"
      >
        <div>
          <tooltip-icon
            icon="mdi-delete"
            text="Delete"
            @click="deleteNFT()"
          ></tooltip-icon>
        </div>
        <div>
          <v-btn color="primary" @click="transferNFTPage(nft)">
            Transfer NFT
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
    <v-snackbar
      v-model="showSnackbar"
      :timeout="2500"
      :color="snackbarColor"
      @input="onSnackbarInput"
    >
      {{ snackbarMessage }}
    </v-snackbar>
  </div>
</template>

<script>
import TooltipIcon from "@/components/TooltipIcon"
export default {
  components: {
    TooltipIcon,
  },
  props: {
    nft: {
      type: Object,
      required: true,
    },
    chainId: {
      type: String,
      required: true,
    },
    // If screen is "modal", the display is smaller and has a selector to select the current NFT
    screen: {
      type: String,
      required: true,
    },
    stores: {
      type: Array,
      default() {
        return []
      },
    },
  },
  data() {
    return {
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "error",
      abiData: {},
      contractAddress: "",
      fromAddress: "",
      isSelected: false,
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
    filteredAttributes() {
      return this.nft.metadata.attributes.filter(
        (attribute) => attribute.value !== undefined && attribute.value !== ""
      )
    },
    nftMedia() {
      return this.nft.media[0].gateway
    },
    contractAddressShortened() {
      const start = this.nft.contract.address.substr(0, 6)
      const end = this.nft.contract.address.substr(
        this.nft.contract.address.length - 4
      )
      return `${start}...${end}`
    },
  },
  mounted() {
    this.fromAddress = sessionStorage.getItem("userAddress")
  },
  methods: {
    getStoreNames(storeIds) {
      return storeIds.map((storeId) => this.getStoreName(storeId))
    },
    getStoreName(storeId) {
      const store = this.stores.find((store) => store.id === storeId)
      return store ? store.name : storeId
    },
    openBlockExplorer() {
      const chainId = parseInt(this.chainId)

      let blockExplorerUrl
      switch (chainId) {
        case 1:
          // Ethereum Mainnet
          blockExplorerUrl = `https://etherscan.io/address/${this.nft.contract.address}`
          break
        case 5:
          // Goerli Testnet
          blockExplorerUrl = `https://goerli.etherscan.io/address/${this.nft.contract.address}`
          break
        case 80001:
          // Mumbai Testnet
          blockExplorerUrl = `https://mumbai.polygonscan.com/address/${this.nft.contract.address}`
          break
        case 137:
          // Matic Mainnet
          blockExplorerUrl = `https://polygonscan.com/address/${this.nft.contract.address}`
          break
        default:
          console.error(`Unsupported network ID: ${chainId}`)
          return
      }

      window.open(blockExplorerUrl, "_blank")
    },
    transferNFTPage(nft) {
      const tokenDecimal = parseInt(nft.id.tokenId, 16)
      this.$router.push({
        path: `${this.$route.path}/transferNFT`,
        query: { id: tokenDecimal },
      })
    },

    showMessage(ok, text) {
      this.snackbarMessage = text
      this.snackbarColor = ok ? "success" : "error"
      this.showSnackbar = true
    },
    showError(text) {
      this.showMessage(false, text)
    },
    async fetchTokenABI() {
      // Gets the ABI to create a transaction
      await this.$axios.get(`/vouchers/nft/abi`).then((res) => {
        this.abiData = res.data.ABI
        this.contractAddress = res.data.contractAddress
      })
    },
    async deleteNFT() {
      await this.fetchTokenABI()
      if (window.ethereum) {
        this.web3 = new window.Web3(window.ethereum)

        await this.$utils.deleteNFT.call(this)

        // Refresh the page after deletion is successful
        window.location.reload()
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },
    onSnackbarInput(val) {
      if (!val) {
        setTimeout(() => {
          window.location.reload()
        }, 2500)
      }
    },
    onCardClick() {
      this.$emit("cardSelected", this.nft.id)
      this.isSelected = !this.isSelected
    },
  },
}
</script>

<style scoped>
.nft-card {
  object-fit: cover;
}

.v-card__actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.selected {
  border: 3px solid rgb(40, 80, 228);
  border-radius: 10px;
}
</style>
