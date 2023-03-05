<template>
  <v-container fluid class="d-flex align-center justify-center">
    <v-card class="mx-auto" outlined>
      <v-container fluid>
        <h1>Transfer NFT</h1>
        <v-img
          v-if="nftObject.media && nftObject.media.length"
          :src="nftMedia"
          :alt="nftObject.title"
          height="300"
          class="nft-card rounded-t-md"
        ></v-img>
        <v-card-title>{{ nftObject.title }}</v-card-title>
        <v-card-subtitle>{{ nftObject.description }}</v-card-subtitle>
        <v-card-text>
          <p>From address: {{ fromAddress }}</p>
          <p v-if="nftObject.id">
            Token ID:
            {{ nftObject.id.tokenId.substr(nftObject.id.tokenId.length - 4) }}
          </p>
        </v-card-text>
        <v-form @submit.prevent="transferNFT">
          <v-text-field
            v-model="toAddress"
            label="To address"
            outlined
            dense
          ></v-text-field>
          <v-btn type="submit" class="mx-auto" color="primary">
            Transfer NFT
          </v-btn>
        </v-form>
      </v-container>
    </v-card>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      nftObject: {
        type: Object,
      },
      fromAddress: "",
      toAddress: "",
      abiData: {},
      contractAddress: "",
      nftMedia: "",
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
  mounted() {
    this.nftObject = JSON.parse(this.$route.query.nft)
    console.log("PARAMS:")
    console.log(this.nftObject)

    this.fromAddress = localStorage.getItem("userAddress")

    this.fetchTokenABI()

    if (this.nftObject.media && this.nftObject.media.length > 0) {
      this.nftMedia = this.nftObject.media[0].gateway
    } else {
      console.log("No media found for this NFT.")
    }
  },
  methods: {
    fetchTokenABI() {
      // Gets the ABI to create a transaction
      this.$axios.get(`/vouchers/nft/abi`).then((res) => {
        this.abiData = res.data.ABI
        this.contractAddress = res.data.contractAddress
      })
    },
    async transferNFT() {
      if (window.ethereum) {
        this.web3 = new window.Web3(window.ethereum)

        await this.$utils.transferNFT.call(this)

        // After the transfer is completed, navigate back to the previous page
        this.$router.go(-1)
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },
  },
}
</script>

<style>
.nft-card {
  width: 300px;
  object-fit: cover;
  display: block;
  margin: 0 auto;
}
</style>
