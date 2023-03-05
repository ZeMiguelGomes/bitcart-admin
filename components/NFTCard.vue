<template>
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
      <v-btn color="primary" @click="transferNFTPage(nft)">
        Transfer NFT
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
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
      price: null,
      networkName: "goerli",
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
  },
}
</script>

<style>
.nft-card {
  width: 300px;
  object-fit: cover;
}
</style>
