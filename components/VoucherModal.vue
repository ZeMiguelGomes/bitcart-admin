<template>
  <v-dialog v-model="isModalVisible" max-width="500">
    <v-card outlined>
      <v-container v-if="!isLoading">
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn icon color="primary" @click="closeModal">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-actions>
        <v-container class="d-flex align-center justify-center">
          <v-hover open-delay="100">
            <template #default="{ hover }">
              <v-card>
                <v-img
                  :src="voucher.image"
                  height="400px"
                  width="400px"
                  :style="{ transform: hover ? 'scale(1.05)' : 'scale(1)' }"
                  contain
                ></v-img>
              </v-card>
            </template>
          </v-hover>
        </v-container>

        <v-card-title class="text-center">
          <div class="headline">{{ voucher.name }}</div>
        </v-card-title>
        <v-card-text>
          <div class="d-flex mb-3">
            <div class="font-weight-bold mr-2">Description:</div>
            <div>{{ voucher.description }}</div>
          </div>
          <div class="d-flex mb-3">
            <div class="font-weight-bold mr-2">Type:</div>
            <div>
              {{
                voucher.attributes.find((a) => a.trait_type === "Discount Type")
                  .value
              }}
            </div>
          </div>
          <div class="d-flex mb-3">
            <div class="font-weight-bold mr-2">Discount Value:</div>
            <div>
              {{
                voucher.attributes.find(
                  (a) => a.trait_type === "Discount Value"
                ).value
              }}
            </div>
          </div>
          <div class="d-flex mb-3">
            <div class="font-weight-bold mr-2">Store:</div>
            <div>
              {{
                voucher.attributes.find((a) => a.trait_type === "Store")
                  .value[0]
              }}
            </div>
          </div>
          <div class="d-flex mb-3">
            <div class="font-weight-bold mr-2">Products ID:</div>
            <div>
              {{
                voucher.attributes.find((a) => a.trait_type === "Product ID")
                  .value
              }}
            </div>
          </div>
        </v-card-text>
      </v-container>
      <v-container v-if="isLoading" class="d-flex justify-center align-center">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
      </v-container>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    showModal: {
      type: Boolean,
      required: true,
    },
    voucherUri: { type: String, required: true },
  },
  data() {
    return {
      voucher: {},
      isModalVisible: this.showModal,
      isLoading: true,
    }
  },
  async mounted() {
    await this.fetchVoucher(this.voucherUri)
    this.isLoading = false
  },
  methods: {
    async fetchVoucher(voucherUri) {
      await this.$axios
        .get(`/vouchers/nft-created?cid=${voucherUri}`)
        .then((response) => {
          this.voucher = response.data
          console.log(this.voucher)
        })
        .catch((error) => {
          console.log(error)
        })
    },
    closeModal() {
      this.$emit("close")
    },
  },
}
</script>

<style scoped>
.nft-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.close-icon {
  position: absolute;
  top: 20px;
  right: 20px;
}
.voucher-description,
.voucher-type,
.voucher-discount-value,
.voucher-store,
.voucher-products {
  margin-bottom: 0;
}
</style>
