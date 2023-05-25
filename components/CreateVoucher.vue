<template>
  <div>
    <v-form ref="form" @submit.prevent>
      <v-container>
        <v-row>
          <v-col sm="12" md="6">
            <v-text-field
              v-model="voucherName"
              label="Voucher Name"
              :rules="[rules.required]"
            ></v-text-field>
          </v-col>
          <v-col sm="12" md="6">
            <v-text-field
              v-model="externalUrl"
              label="External URL"
              :rules="[rules.url]"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col sm="12" md="6">
            <v-text-field
              v-model="description"
              class="mt-3"
              label="Description"
              :rules="[rules.required, rules.min]"
            ></v-text-field>
          </v-col>
          <v-col sm="12" md="6">
            <v-select
              v-model="selectedStores"
              :items="storeOptions"
              :item-text="'name'"
              :item-value="'id'"
              label="Store"
              :rules="[rules.selectRequired]"
              multiple
              chips
              deletable-chips
              item-icon="mdi-check"
              item-avatar="image"
              :item="
                (props) => {
                  return {
                    image: props.item.image,
                    name: props.item.name,
                    id: props.item.id,
                    warning: props.item.warning,
                  }
                }
              "
            >
              <template #item="{ item }">
                <v-list-item-content>
                  <v-list-item-title>
                    {{ item.name }}
                  </v-list-item-title>
                </v-list-item-content>
                <v-list-item-avatar>
                  <v-icon
                    v-if="item.hasWarning"
                    color="warning"
                    class="warning-icon"
                  >
                    mdi-alert
                  </v-icon>
                </v-list-item-avatar>
              </template>
            </v-select>
          </v-col>
        </v-row>
      </v-container>

      <v-container>
        <v-row>
          <v-col sm="12" md="4">
            <div style="font-size: 18px" class="font-weight-bold mb-4">
              Discount Type:
            </div>
            <v-btn-toggle
              v-model="voucherType"
              mandatory
              class="v-btn-toggle--grouped d-flex flex-column"
            >
              <v-btn
                outlined
                color="primary"
                class="rounded-lg fixed-width mt-2"
                value="Product-based"
                style="width: 150px"
              >
                <span
                  :class="
                    voucherType === 'Product-based' ? 'text--primary' : ''
                  "
                  >Product Based</span
                >
              </v-btn>
              <v-btn
                outlined
                color="primary"
                class="rounded-lg fixed-width mt-2"
                value="Absolute"
                style="width: 150px"
              >
                <span :class="voucherType === 'Absolute' ? 'text--primary' : ''"
                  >Absolute</span
                >
              </v-btn>
              <v-btn
                outlined
                color="primary"
                class="rounded-lg fixed-width mt-2"
                value="Fixed"
                style="width: 150px"
              >
                <span :class="voucherType === 'Fixed' ? 'text--primary' : ''"
                  >Fixed</span
                >
              </v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col v-if="voucherType === 'Absolute'" sm="12" md="4">
            <v-text-field
              v-model="absoluteDiscount"
              label="Percentage Discount"
              suffix="%"
              :rules="[rules.required, rules.positive]"
            ></v-text-field>
          </v-col>
          <v-col v-if="voucherType === 'Fixed'" sm="12" md="4">
            <div class="d-flex align-items-center">
              <v-text-field
                v-model="fixedDiscountAmount"
                label="Discount Amount"
                class="mr-4"
                :rules="[rules.required, rules.positive]"
              ></v-text-field>
              <v-btn-toggle
                id="fixedDiscountType"
                v-model="fixedDiscountType"
                mandatory
              >
                <v-btn
                  outlined
                  color="primary"
                  depressed
                  rounded
                  medium
                  value="EUR"
                  >€</v-btn
                >
                <v-btn
                  outlined
                  color="primary"
                  depressed
                  rounded
                  medium
                  value="USD"
                  >$</v-btn
                >
                <v-btn
                  outlined
                  color="primary"
                  depressed
                  rounded
                  medium
                  value="GBP"
                  >£</v-btn
                >
              </v-btn-toggle>
            </div>
          </v-col>

          <v-col v-if="voucherType === 'Product-based'" sm="12" md="4">
            <div v-show="!productIsFree">
              <v-text-field
                v-model="productDiscount"
                label="Discount"
                :rules="[rules.required, rules.positive]"
              >
                <template #append>
                  <v-btn-toggle
                    v-model="productBasedDiscountSymbol"
                    mandatory
                    class="ml-4"
                  >
                    <v-btn
                      outlined
                      color="primary"
                      depressed
                      rounded
                      medium
                      value="%"
                    >
                      %
                    </v-btn>
                    <v-btn
                      outlined
                      color="primary"
                      depressed
                      rounded
                      medium
                      value="€"
                    >
                      €
                    </v-btn>
                  </v-btn-toggle>
                </template>
              </v-text-field>
            </div>
            <v-combobox
              v-model="selectedProducts"
              :search="productSearch"
              :items="states"
              item-text="name"
              item-value="productID"
              label="Product"
              clearable
              persistent-hint
              chips
              multiple
              deletable-chips
              :rules="[rules.selectRequired]"
              @change="onProductChange"
            >
              <template #item="{ item }">
                <v-avatar v-if="item.image" size="32px">
                  <img :src="item.image" />
                </v-avatar>
                <v-avatar
                  v-else
                  :style="{
                    backgroundColor: 'white',
                    border: '3px solid black',
                  }"
                  size="32px"
                >
                  <span>{{ getInitial(item.name) }}</span>
                </v-avatar>
                <span class="ml-3 text-body-2">{{ item.name }}</span>
              </template>
            </v-combobox>
            <v-checkbox
              v-model="productIsFree"
              label="Discount the product price to zero"
            ></v-checkbox>
          </v-col>
        </v-row>
      </v-container>

      <voucher-modal
        v-if="showVoucherModal && voucherURI"
        :show-modal="showVoucherModal"
        :voucher-uri="voucherURI"
        @close="handleModalClose"
      />

      <v-container>
        <v-row>
          <v-col>
            <v-btn
              type="submit"
              color="primary"
              :loading="isLoading"
              @click="createVoucher"
              >Create Voucher</v-btn
            >
          </v-col>
        </v-row>
      </v-container>
    </v-form>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="5000">{{
      snackbarMessage
    }}</v-snackbar>
  </div>
</template>

<script>
import VoucherModal from "@/components/VoucherModal.vue"

export default {
  components: { VoucherModal },
  data() {
    return {
      voucherName: "",
      externalUrl: "",
      description: "",
      voucherType: "Product-based",
      absoluteDiscount: "",
      fixedDiscountAmount: "",
      fixedDiscountType: "",
      productDiscount: "",
      productBasedDiscountSymbol: "%",
      selectedProducts: [],
      productIsFree: false,
      rules: this.$utils.rules,
      selectedStores: [],
      storeOptions: [],
      abiData: {},
      contractAddress: "",
      voucherCID: null,
      isLoading: false, // For the Create Voucher button when pressed
      states: [
        { name: "Item 1", productID: 1, image: null },
        { name: "Item 2", productID: 2, image: null },
        { name: "Item 3", productID: 3, image: null },
        { name: "Item 4", productID: 4, image: null },
        { name: "Item 5", productID: 5, image: null },
      ],
      productSearch: null,
      descriptionLimit: 60,
      entries: [],
      model: null,
      search: null,
      searchProducts: null,
      snackbar: false,
      snackbarMessage: "",
      snackbarColor: "warning",
      showVoucherModal: false,
      voucherURI: null,
      mintSuccess: false,
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
    selectedStores: {
      immediate: true,
      handler: function (newVal, oldVal) {
        // Call fetchProducts function
        // Get the new store IDs that are not in the old store IDs
        const newStoreIds = newVal.filter((id) => !oldVal.includes(id))

        console.log(newVal)
        console.log(oldVal)

        if (this.voucherType === "Product-based") {
          this.fetchProducts(newStoreIds)
        } else {
          const storeSelected = this.storeOptions.find(
            (option) => option.id === newStoreIds.toString()
          )

          if (storeSelected !== undefined) {
            if (storeSelected.hasWarning) storeSelected.hasWarning = false
          }
        }

        // Remove products of removed stores
        let removedStores = []
        if (oldVal && oldVal.length > 0) {
          removedStores = oldVal.filter((id) => !newVal.includes(id))
          console.log(removedStores)
          this.removeProductsOfStores(removedStores)
        }
      },
    },
  },
  created() {
    // Make GET request to "/stores" endpoint to get store information
    this.$axios
      .get("/stores")
      .then((response) => {
        // Save store information to component data
        this.storeOptions = response.data.result.map((store) => {
          return {
            id: store.id,
            name: store.name,
            hasWarning: false,
          }
        })
      })
      .catch((error) => {
        this.snackbarMessage = "Error fetching stores"
        this.snackbar = true
        this.snackbarColor = "warning"
        console.error(error)
      })
  },
  methods: {
    handleModalClose() {
      this.showVoucherModal = false
      this.$emit("modalClosed") // Emit the event to notify the parent component
    },
    showMessage(ok, text) {
      this.snackbarMessage = text
      this.snackbar = true
      this.snackbarColor = ok ? "success" : "error"
    },
    showError(text) {
      this.showMessage(false, text)
    },
    getAvatarColor() {
      const colors = [
        "red",
        "green",
        "blue",
        "purple",
        "orange",
        "black",
        "indigo",
        "amber",
        "brown",
      ]
      const randomIndex = Math.floor(Math.random() * colors.length)
      return colors[randomIndex]
    },
    getInitial(name) {
      return name ? name.charAt(0).toUpperCase() : null
    },
    removeProductsOfStores(storeIds) {
      this.states = this.states.filter(
        (product) => !storeIds.includes(product.storeId)
      )
      if (this.selectedProducts && this.selectedProducts.length > 0) {
        this.selectedProducts = this.selectedProducts.filter(
          (product) => !storeIds.includes(product.storeId)
        )
      }
    },
    async fetchProducts(storeIds) {
      console.log(storeIds)
      if (storeIds.length > 0) {
        try {
          const response = await this.$axios.get("/vouchers/shopify-products", {
            params: { storeIds: storeIds.join(",") },
          })
          const products = response.data

          // Add the StoreID to the products array
          const mappedProducts = products.map((product) => {
            return {
              productID: product.productID,
              name: product.name,
              image: product.image,
              storeId: storeIds.toString(),
            }
          })
          console.log(products)
          const storeOption = this.storeOptions.find(
            (option) => option.id === storeIds.toString()
          )

          if (!storeOption.hasWarning) storeOption.hasWarning = false
          // TODO:
          // 1-> If there are any problems with the request like and error, show a yellow popup with the warning and the store - DONE
          // 2-> When removing the store from the selector, remove its products from the list
          // 3-> Display the image in a circle in the Combobox with the products and if possible the store that is connected to

          this.states = [...this.states, ...mappedProducts]

          console.log(this.states)
        } catch (error) {
          const storeOption = this.storeOptions.find(
            (option) => option.id === storeIds.toString()
          )
          if (storeOption) {
            storeOption.hasWarning = true
            storeOption.warning = error.response
              ? error.response.data.detail
              : "An error occurred while fetching products"
          }

          if (error.response && error.response.status >= 400) {
            // Show snackbar with error message
            this.snackbarMessage = error.response.data.detail
            this.snackbar = true
            this.snackbarColor = "warning"
          } else {
            // Show a generic error message
            this.snackbarMessage = "An error occurred while fetching products"
            this.snackbar = true
          }
        }
      }
    },
    async fetchTokenABI() {
      // Gets the ABI to create a transaction
      await this.$axios.get(`/vouchers/nft/abi`).then((res) => {
        this.abiData = res.data.ABI
        this.contractAddress = res.data.contractAddress
      })
    },
    async createVoucher() {
      if (this.$refs.form.validate() || this.productIsFree) {
        this.isLoading = true // Make the button loading

        const data = {
          name: this.voucherName,
          description: this.description,
          externalUrl: this.externalUrl,
          voucherType: this.voucherType,
        }

        switch (this.voucherType) {
          case "Absolute":
            data.discountValue = `${this.absoluteDiscount}%`
            data.store = this.selectedStores
            break
          case "Fixed":
            data.discountValue = this.fixedDiscountAmount
            data.discountCurrency = this.fixedDiscountType
            data.store = this.selectedStores
            break
          case "Product-based":
            if (this.productIsFree) {
              this.discountValue = "Free"
              data.discountValue = this.discountValue
            } else {
              data.discountValue = `${this.productDiscount}${this.productBasedDiscountSymbol}`
            }
            data.store = this.selectedStores

            // eslint-disable-next-line no-case-declarations
            const productIds = this.selectedProducts.map((product) =>
              product.productID.toString()
            )
            data.productsID = productIds
            break
        }

        console.log(data)
        await this.fetchTokenABI()
        await this.$axios
          .post("/vouchers/create", data)
          .then(async (response) => {
            // Returns the CID of the JSON file
            // Communicate with the smart contract and mint a new NFT
            this.voucherCID = response.data
            console.log(this.voucherCID)
            const voucherURI = `https://gateway.pinata.cloud/ipfs/${this.voucherCID}`

            await this.mintVoucher(voucherURI)

            if (this.mintSuccess) {
              this.showMessage(true, "Voucher created succesffully!")
              this.voucherURI = this.voucherCID
              this.showVoucherModal = true
              this.isLoading = false
              this.$store.dispatch("fetchVoucherCount")
            }
          })
          .catch((error) => {
            this.isLoading = false
            console.log(error)
          })
      } else {
        this.showError("Please fill all the camps of the form")
        // console.log("form not valid")
      }
    },
    async mintVoucher(voucherURI) {
      if (window.ethereum) {
        this.web3 = new window.Web3(window.ethereum)

        const mintResponse = await this.$utils.mintNFT.call(this, voucherURI)

        if (mintResponse.success) {
          this.mintSuccess = true
        }

        // After complete, show the voucher in the screen like a modal
      } else {
        window.location.href = "https://metamask.io/download"
      }
    },
    onProductChange(val) {
      const selectedProducts = []

      val.forEach((item) => {
        if (typeof item === "string") {
          const newItem = this.states.find((s) => s.name === item)
          console.log(newItem)
          if (newItem) {
            selectedProducts.push({ productID: newItem.id, name: newItem.name })
          } else {
            const nameID = `Product-${item}`
            const productID = parseInt(item)
            // Check if the value inserted is a number if not show a error
            if (!isNaN(productID)) {
              // Show an error message to the user
              selectedProducts.push({ productID, name: nameID })
            }
          }
        } else if (item.productID && item.name) {
          selectedProducts.push(item)
        }
      })
      this.selectedProducts = selectedProducts
      console.log(this.selectedProducts)
    },
  },
}
</script>

<style scoped>
.rounded-radio .v-input--selection-controls__input {
  border-radius: 20px;
  padding: 12px;
}
</style>
