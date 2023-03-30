<template>
  <v-container class="pa-0">
    <v-snackbar v-model="showSnackbar" :timeout="2500" color="success" bottom>
      <v-icon>mdi-content-copy</v-icon>
      Successfully copied to clipboard!
    </v-snackbar>
    <v-snackbar v-model="showPartial" :timeout="2500" color="info" bottom>
      Partial payment detected. Please pay in full to complete the invoice.
    </v-snackbar>
    <v-dialog
      hide-overlay
      persistent
      no-click-animation
      :value="showDialog"
      max-width="400px"
      class="my-md-12 mx-auto"
      transition="none"
      :fullscreen="$vuetify.breakpoint.mobile"
    >
      <v-card :loading="loading && !errorText" class="elevation-24">
        <div v-if="loading" :class="$route.query.modal ? 'pb-6' : 'py-6'">
          <close-button @closedialog="closeDialog" />
          <div v-if="errorText" class="text-center">
            {{ errorText ? errorText : "Loading..." }}
          </div>
        </div>
        <div v-else>
          <TabbedCheckout
            v-if="status === 'pending'"
            ref="partialPayment"
            :checkout-page="true"
            :invoice.sync="invoice"
            :store="store"
            :line-items="lineItems"
            class="px-0 pb-0"
            @closedialog="closeDialog"
            @update:invoice="handleUpdateInvoice"
          />
          <v-card-text v-else class="no-overflow py-12">
            <close-button class="mt-n8" @closedialog="closeDialog" />
            <div
              :class="colorClass(texts[status].icon)"
              class="d-flex justify-center success-circle success-icon"
            >
              <v-icon
                :color="
                  ['mdi-check', 'mdi-cash-refund'].includes(texts[status].icon)
                    ? 'green'
                    : 'red'
                "
                class="d-flex justify-center"
              >
                {{ texts[status].icon }}
              </v-icon>
            </div>
            <div class="d-flex justify-center pt-4">
              <div class="text-subtitle-1 font-weight-bold">
                {{ texts[status].text }}
              </div>
            </div>
          </v-card-text>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import TabbedCheckout from "@/components/TabbedCheckout"
import CloseButton from "@/components/CloseButton"
export default {
  auth: false,
  components: {
    TabbedCheckout,
    CloseButton,
  },
  layout: "checkout",
  data() {
    return {
      websocket: null,
      showSnackbar: false,
      showPartial: false,
      showDialog: true,
      status: "pending",
      invoice: {},
      store: {},
      loading: true,
      errorText: "",
      texts: {
        expired: {
          icon: "mdi-close",
          text: "This invoice has expired",
        },
        invalid: {
          icon: "mdi-close",
          text: "This invoice has been marked as invalid",
        },
        paid: {
          icon: "mdi-check",
          text: "This invoice has been paid",
        },
        confirmed: {
          icon: "mdi-check",
          text: "This invoice has been paid",
        },
        complete: {
          icon: "mdi-check",
          text: "This invoice has been paid",
        },
        refunded: {
          icon: "mdi-cash-refund",
          text: "This invoice has been refunded",
        },
        "": {
          icon: "mdi-close",
          text: "This invoice is invalid",
        },
      },
      lineItems: [],
      latestInvoiceData: null,
    }
  },
  beforeCreate() {
    this.$vuetify.theme.dark = false // dark theme unsupported here
  },
  mounted() {
    // Gets all the products that are in the user's checkout
    const encodedLineItems = this.$route.query.lineItems
    if (encodedLineItems) {
      const decodedLineItems = decodeURIComponent(encodedLineItems)
      this.lineItems = JSON.parse(decodedLineItems)
    }

    this.$axios
      .get(`/invoices/${this.$route.params.id}`)
      .then((resp) => {
        this.invoice = resp.data
        this.status = resp.data.status
        window.parent.postMessage("loaded", "*")
        this.$axios
          .get(`/stores/${resp.data.store_id}`)
          .then((resp1) => {
            this.store = resp1.data
            this.$vuetify.theme.dark =
              this.store.checkout_settings.use_dark_mode
            this.loading = false
            // The frame is already in the screen, so lets start a websocket to listen the payment methods
            this.startWebsocket()
          })
          .catch((err) => (this.errorText = err))
      })
      .catch((err) => this.setError(err))
  },
  beforeDestroy() {
    if (this.websocket) {
      this.websocket.close()
    }
  },
  methods: {
    async getInvoice() {
      return await this.$axios
        .get(`/invoices/${this.$route.params.id}`)
        .then((resp) => {
          return resp.data
        })
        .catch((err) => this.setError(err))
    },
    handleUpdateInvoice($event) {
      console.log("$event:", $event)
    },
    setError(err) {
      if (err.response && err.response.status === 404) {
        this.errorText = "Invoice not found"
      } else {
        this.errorText = err
      }
    },
    closeDialog() {
      this.showDialog = false
      window.parent.postMessage("close", "*") // for iframes
    },
    startWebsocket() {
      let url = this.combineURLs(
        `${this.$store.getters.apiURL}`,
        `/ws/invoices/${this.$route.params.id}`
      )
      url = url.replace("http://", "ws://").replace("https://", "wss://")
      this.websocket = new WebSocket(url)
      // The following method waits for the event/answer sent by the backend to the previous endpoint
      this.websocket.onmessage = async (event) => {
        const data = JSON.parse(event.data)
        console.log("DATA JSON")
        console.log(data)
        const status = data.status
        if (
          status === "pending" &&
          this.invoice.sent_amount !== data.sent_amount
        ) {
          // received partial payment
          // get the latest information about the invoice
          const latestInvoiceData = await this.getInvoice()
          console.log("Data Invoice")
          console.log(latestInvoiceData)
          this.latestInvoiceData = latestInvoiceData

          let blockVoucherTab = true
          if (
            this.latestInvoiceData &&
            this.latestInvoiceData.tx_hashes &&
            this.latestInvoiceData.tx_hashes.length > 0
          ) {
            console.log(this.latestInvoiceData.tx_hashes)
            blockVoucherTab = false
          }
          this.invoice.exception_status = data.exception_status
          this.invoice.sent_amount = data.sent_amount
          this.invoice.paid_currency = data.paid_currency
          this.$bus.$emit("showDetails")
          this.showPartial = true
          this.$refs.partialPayment.$emit(
            "partial-payment-received",
            blockVoucherTab
          )
        }
        if (this.invoice.status !== status) {
          window.parent.postMessage(
            {
              invoice_id: this.invoice.id,
              status,
              exception_status: data.exception_status,
              sent_amount: data.sent_amount,
              paid_currency: data.paid_currency,
            },
            "*"
          )
        }
        if (
          ["paid", "confirmed", "complete"].includes(status) &&
          this.invoice.redirect_url
        ) {
          this.$utils.redirectTo(this.invoice.redirect_url)
        }
        this.status = status
      }
    },
    colorClass(icon) {
      if (["mdi-check", "mdi-cash-refund"].includes(icon)) return "green--text"
      return "red--text"
    },
    copyText(text) {
      this.$utils.copyToClipboard(text)
      this.whatToCopy = "ID"
      this.showSnackbar = true
    },
    combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "")
        : baseURL
    },
  },
}
</script>

<style lang="scss">
@import "~vuetify/src/components/VDialog/_variables.scss";

$dialog-max-height: 100%;

@import "~vuetify/src/components/VDialog/VDialog.sass";
</style>

<style scoped>
@keyframes checkbounce {
  0% {
    transform: matrix3d(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  4.7% {
    transform: matrix3d(0.45, 0, 0, 0, 0, 0.45, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  9.41% {
    transform: matrix3d(0.883, 0, 0, 0, 0, 0.883, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  14.11% {
    transform: matrix3d(1.141, 0, 0, 0, 0, 1.141, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  18.72% {
    transform: matrix3d(1.212, 0, 0, 0, 0, 1.212, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  24.32% {
    transform: matrix3d(1.151, 0, 0, 0, 0, 1.151, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  29.93% {
    transform: matrix3d(1.048, 0, 0, 0, 0, 1.048, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  35.54% {
    transform: matrix3d(0.979, 0, 0, 0, 0, 0.979, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  41.04% {
    transform: matrix3d(0.961, 0, 0, 0, 0, 0.961, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  52.15% {
    transform: matrix3d(0.991, 0, 0, 0, 0, 0.991, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  63.26% {
    transform: matrix3d(1.007, 0, 0, 0, 0, 1.007, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  85.49% {
    transform: matrix3d(0.999, 0, 0, 0, 0, 0.999, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }

  100% {
    transform: matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }
}
.success-circle {
  border-radius: 50%;
  height: 154px;
  width: 154px;
  margin: 0 auto;
  border-width: 2px;
  border-style: solid;
}
.green-color {
  border-color: #13e5b6;
}
.red-color {
  border-color: red;
}
.success-icon {
  animation: checkbounce 750ms linear both;
}
.no-overflow {
  overflow: hidden;
}
</style>
