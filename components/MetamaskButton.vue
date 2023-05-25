<template>
  <div>
    <v-btn
      color="primary"
      :disabled="insufficientBalance"
      :loading="loading"
      @click="connectToMetamask"
    >
      <template v-if="insufficientBalance">Insuficient Balance</template>
      <template v-else>
        <v-img :src="`${STATIC_PATH}/metamask.svg`" height="40" width="40" />Pay
        with MetaMask
      </template>
    </v-btn>
    <v-snackbar
      v-model="showSnackbar"
      :timeout="2500"
      :color="snackbarColor"
      bottom
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
<script>
export default {
  props: {
    abi: {
      type: Object,
      required: true,
    },
    updateAddress: {
      type: Function,
      required: true,
    },
    method: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      showSnackbar: false,
      snackbarText: "",
      snackbarColor: "error",
      loading: false,
      insufficientBalance: false,
      dueAmount: "",
      latestInvoiceData: null,
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
  watch: {
    method(v) {
      this.insufficientBalance = false
      this.loading = false
    },
  },
  methods: {
    showMessage(ok, text) {
      this.loading = false
      this.snackbarText = text
      this.snackbarColor = ok ? "success" : "error"
      this.showSnackbar = true
    },
    showError(text) {
      this.showMessage(false, text)
    },
    async connectToMetamask() {
      if (window.ethereum) {
        const latestInvoiceData = await this.getInvoice()
        this.latestInvoiceData = latestInvoiceData
        this.dueAmount = await this.getDueAmount()
        this.web3 = new window.Web3(window.ethereum)
        await this.$utils.connectToWallet.call(
          this,
          "metamask",
          () => window.ethereum.selectedAddress,
          this.updateAddress
        )
        this.loading = false
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },
    async getInvoice() {
      return await this.$axios
        .get(`/invoices/${this.$route.params.id}`)
        .then((resp) => {
          return resp.data
        })
        .catch((err) => this.setError(err))
    },
    getDueAmount() {
      if (this.method.name === this.latestInvoiceData.paid_currency) {
        const difference = Math.max(
          0,
          this.method.amount - this.latestInvoiceData.sent_amount
        )
        const decimalValue = this.$utils.decimalStr(
          difference,
          this.method.divisibility
        )
        return decimalValue
      } else {
        return this.method.amount
      }
    },
  },
}
</script>
