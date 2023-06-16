<template>
  <v-container fluid class="d-flex align-center justify-center">
    <v-card class="mx-auto" outlined>
      <v-container fluid>
        <h1>Transfer NFT</h1>
        <v-img
          v-if="nftObject.media && nftObject.media.length"
          :src="nftMedia"
          :alt="nftObject.title"
          height="300px"
          class="nft-card rounded"
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
        <v-form ref="transferVoucherAddressForm" @submit.prevent="transferNFT">
          <v-text-field
            v-model="toAddress"
            label="To address"
            outlined
            dense
            :rules="[rules.required]"
            :error-messages="toAddressErrors"
          ></v-text-field>
          <v-btn
            type="submit"
            class="mx-auto"
            color="primary"
            :loading="isTransferLoading"
          >
            Transfer NFT
          </v-btn>
        </v-form>
      </v-container>
      <v-snackbar v-model="showSnackbar" :timeout="2500" :color="snackbarColor">
        {{ snackbarMessage }}
      </v-snackbar>
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
      tokenId: "",
      rules: this.$utils.rules,
      toAddressErrors: "",
      showSnackbar: false,
      snackbarMessage: "",
      snackbarColor: "error",
      isTransferLoading: false,
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
  async mounted() {
    // this.nftObject = JSON.parse(this.$route.query.nft)
    this.tokenId = this.$route.query.id

    this.fromAddress = sessionStorage.getItem("userAddress")
    await this.getNFTById()
    this.fetchTokenABI()

    if (this.nftObject.media && this.nftObject.media.length > 0) {
      this.nftMedia = this.nftObject.media[0].gateway
    } else {
      console.log("No media found for this NFT.")
    }
  },
  methods: {
    async getNFTById() {
      await this.$axios
        .get(`/vouchers/${this.tokenId}`)
        .then((res) => {
          this.nftObject = res.data
        })
        .catch((error) => {
          // Handle the error
          console.error(error)
        })
    },
    fetchTokenABI() {
      // Gets the ABI to create a transaction
      this.$axios.get(`/vouchers/nft/abi`).then((res) => {
        this.abiData = res.data.ABI
        this.contractAddress = res.data.contractAddress
      })
    },
    async transferNFT() {
      if (!this.toAddress) {
        const ref = this.$refs.transferVoucherAddressForm

        if (!ref.validate()) return
      }
      this.isTransferLoading = true
      if (window.ethereum) {
        this.web3 = new window.Web3(window.ethereum)

        // Validate the Ethereum address
        if (!this.web3.utils.isAddress(this.toAddress)) {
          this.$refs.transferVoucherAddressForm.resetValidation()
          this.toAddressErrors = "Invalid Ethereum address"
          this.isTransferLoading = false
          return
        }
        this.toAddressErrors = ""
        const response = await this.$utils.transferNFT.call(this)
        this.isTransferLoading = false

        if (response?.success) {
          this.$router.push({ path: "/vouchers" })
        }

        // After the transfer is completed, navigate back to the previous page
      } else {
        window.location.href = "https://metamask.io/download"
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
