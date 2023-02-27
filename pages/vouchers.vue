<template>
    <v-container>
        <p class="text-h4">My Vouchers</p>
        <MetaMaskLogin />
    </v-container>
</template>

<script>
import MetaMaskLogin from "@/components/MetaMaskLogin.vue"
export default {
    components: {
        MetaMaskLogin,
    },
}
</script>
