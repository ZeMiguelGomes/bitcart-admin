<template>
  <v-container>
    <v-tabs
      v-model="tab"
      background-color="transparent"
      centered
      large
      color="primary"
      class="v-glass"
    >
      <v-tab>My NFTs</v-tab>
      <v-tab>Create Vouchers</v-tab>

      <v-tab-item>
        <v-container>
          <p class="text-h4">My NFTs</p>
          <MetaMaskLogin :screen="'admin'" />
        </v-container>
      </v-tab-item>

      <v-tab-item>
        <v-container>
          <CreateVoucher />
        </v-container>
      </v-tab-item>
    </v-tabs>
  </v-container>
</template>

<script>
import MetaMaskLogin from "@/components/MetaMaskLogin.vue"
import CreateVoucher from "@/components/CreateVoucher.vue"
export default {
  components: {
    MetaMaskLogin,
    CreateVoucher,
  },
  data() {
    return {
      tab: null,
    }
  },
}
</script>

<style scoped>
.v-tabs__item {
  font-size: 18px;
  padding: 12px 24px;
}

.v-tabs__slider {
  height: 4px;
  background-color: #1976d2;
}

.v-tab--active {
  color: #1976d2;
}

.v-glass {
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(9px);
  -webkit-backdrop-filter: blur(9px);
  border-radius: 10px;
  border: 10px solid rgb(255, 255, 255);
}
</style>
