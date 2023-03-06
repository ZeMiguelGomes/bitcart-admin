<template>
  <div>
    <v-card class="nft-card" outlined>
      <v-img
        :src="nftMedia"
        :alt="nft.title"
        height="300"
        class="rounded-t-md"
      ></v-img>

      <v-card-text>
        <h2 class="text-xl font-weight-bold mb-1">{{ nft.title }}</h2>
        <p class="mb-2">
          Id: {{ nft.id.tokenId.substr(nft.id.tokenId.length - 4) }}
        </p>
        <p class="mb-4">{{ contractAddressShortened }}</p>
        <p class="text-gray-600">{{ nft.description.substr(0, 150) }}</p>
        <div
          v-for="attribute in nft.metadata.attributes"
          :key="attribute.trait_type"
        >
          <span class="font-weight-bold">{{ attribute.trait_type }}: </span>
          <span>{{ attribute.value }}</span>
        </div>
      </v-card-text>
      <v-card-actions class="d-flex justify-center">
        <v-btn color="primary" @click="openBlockExplorer">
          View on Block Explorer
        </v-btn>
      </v-card-actions>
      <v-card-actions>
        <tooltip-icon
          icon="mdi-delete"
          text="Delete"
          class="mr-2"
          @click="deleteNFT()"
        ></tooltip-icon>
        <v-btn color="primary" @click="transferNFTPage(nft)">
          Transfer NFT
        </v-btn>
      </v-card-actions>
    </v-card>
    <v-snackbar
      v-model="showSnackbar"
      :timeout="2500"
      color="success"
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
  },
  data() {
    return {
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "error",
      abiData: {},
      contractAddress: "",
      fromAddress: "",
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
    console.log(this.nft)
    this.fromAddress = localStorage.getItem("userAddress")
  },

  methods: {
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
      this.$router.push({
        path: `${this.$route.path}/transferNFT`,
        query: { nft: JSON.stringify(nft) },
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

        const contract = await new this.web3.eth.Contract(
          this.abiData,
          this.contractAddress
        )

        const tokenIdHex = this.web3.utils.toHex(this.nft.id.tokenId)

        const functionSignature = contract.methods
          .burnToken(this.web3.utils.toBN(tokenIdHex))
          .encodeABI()

        const gasPrice = await this.web3.eth.getGasPrice()

        const gasEstimate = await contract.methods
          .burnToken(tokenIdHex)
          .estimateGas({ from: this.fromAddress })

        const transactionParameters = {
          to: contract.options.address,
          from: this.fromAddress,
          gasPrice: this.web3.utils.toHex(gasPrice),
          gas: this.web3.utils.toHex(gasEstimate),
          data: functionSignature,
        }

        // sign the transaction via MetaMask
        try {
          const txHash = await this.web3.eth.sendTransaction(
            transactionParameters
          )
          console.log("Transaction hash: ", txHash)
          this.showMessage(true, "Voucher Deleted successfully")
        } catch (error) {
          console.log("Error transferring NFT: ", error)
          this.showError(false, error.message)
        }
        // After the transfer is completed wait 2 seconds and then refresh the page
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
  },
}
</script>

<style>
.nft-card {
  width: 300px;
  object-fit: cover;
}

.v-card__actions {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
</style>
