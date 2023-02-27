<template>
    <v-container class="d-flex justify-center align-center">
        <div>
            <v-btn v-if="!address" color="primary" dark large block @click="connectWallet">
                <v-img :src="`${STATIC_PATH}/metamask.svg`" height="40" width="40" class="mr-2" />
                Connect Wallet
            </v-btn>
            <span v-if="address" class="mt-4 text-center">
                Connected with address: {{ formatAddress }}
            </span>
            {{ testApi }}
        </div>
    </v-container>
</template>

<script>
export default {
    name: "MyComponent",
    data() {
        return {
            address: null,
            providerLoaded: false, // add a flag to track if the script has loaded
            testApi: "",
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
        formatAddress() {
            if (this.address) {
                const firstFour = this.address.slice(0, 6)
                const lastFour = this.address.slice(-4)
                return `${firstFour}...${lastFour}`
            } else {
                return ""
            }
        },
    },
    created() {
        this.$watch(() => this.connectAPI())
    },
    methods: {
        async connectWallet() {
            if (typeof window.ethereum !== "undefined") {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                })
                this.address = accounts[0]
            } else {
                window.location.href = "https://metamask.io/download"
            }
        },
        connectAPI() {
            this.$axios.get("/vouchers").then((resp) => {
                // Get all the data (invoices, wallets, stores) to display in the table
                this.testApi = resp.data
                console.log(resp.data)
            })
        },
    },
}
</script>

<style scoped>
button:focus {
    outline: none;
}
</style>
