function isNull(v) {
  return typeof v === "undefined" || v === "" || v == null
}

export default {
  isObjectEqual(a, b) {
    if (!a || !b) return a === b
    const aKeys = Object.keys(a).sort()
    const bKeys = Object.keys(b).sort()
    if (aKeys.length !== bKeys.length) {
      return false
    }
    return aKeys.every((key, i) => {
      const aVal = a[key]
      const bKey = bKeys[i]
      if (bKey !== key) return false
      const bVal = b[key]
      if (aVal == null || bVal == null) return aVal === bVal
      if (typeof aVal === "object" && typeof bVal === "object") {
        return this.isObjectEqual(aVal, bVal)
      }
      return String(aVal) === String(bVal)
    })
  },
  async copyToClipboard(text) {
    let hasPermission = true
    if (navigator.clipboard && navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "clipboard-write",
          allowWithoutGesture: false,
        })
        hasPermission = permissionStatus.state === "granted"
      } catch (err) {}
    }
    if (navigator.clipboard && hasPermission) {
      await navigator.clipboard.writeText(text)
    } else {
      const el = document.createElement("textarea")
      el.addEventListener("focusin", (e) => e.stopPropagation())
      el.value = text
      el.setAttribute("readonly", "")
      el.style.position = "absolute"
      el.style.left = "-9999px"
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
  },
  redirectTo(url, newTab = false) {
    if (url) {
      if (newTab) window.open(url, "_blank")
      else window.location = url
    }
  },
  truncate(str, length = 22) {
    if (str === null) str = ""
    if (str.length > length) return str.slice(0, length) + "..."
    else return str
  },
  maybeEnableDarkTheme() {
    const hours = new Date().getHours()
    const isDayTime = hours > 6 && hours < 20
    if (!isDayTime) {
      this.$vuetify.theme.dark = true
    }
  },
  isEmpty(obj) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false
      }
    }
    return true
  },
  rules: {
    required: (v) => !isNull(v) || "Required.",
    min: (v) => (!isNull(v) && v.length >= 8) || "Min 8 characters",
    email: (v) => {
      const pattern =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return isNull(v) || pattern.test(v) || "Invalid e-mail."
    },
    int: (v) => isFinite(v) || "Integer required",
    url: (v) => {
      if (isNull(v)) {
        return true
      }
      try {
        const url = v.startsWith("www.") ? `http://${v}` : v
        new URL(url) // eslint-disable-line no-new
        return true
      } catch (_) {
        return "Invalid URL"
      }
    },
    positive: (v) => isNull(v) || v > 0 || "Must be positive",
    nonnegative: (v) => isNull(v) || v >= 0 || "Must be non-negative",
    quantity: (v) => isNull(v) || v >= -1 || "Must be non-negative or -1",
    selectRequired: (v) => (v !== null && v.length > 0) || "Required.",
  },
  downloadFile(resp) {
    const url = window.URL.createObjectURL(new Blob([resp.data]))
    const link = document.createElement("a")
    link.href = url
    const contentDisposition = resp.headers["content-disposition"]
    let filename = "unknown"
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename=(.+)/)
      if (fileNameMatch.length === 2) {
        filename = fileNameMatch[1]
      }
    }
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
  async connectToWallet(wallet, addressfunc, updateAddress) {
    this.loading = true
    const chainid = await this.web3.eth.getChainId()
    if (chainid !== this.method.chain_id)
      return this.showError(
        `Please change your network in ${wallet} to work on the ${this.method.currency.toUpperCase()} network (chain id ${
          this.method.chain_id
        })`
      )
    if (wallet === "metamask") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" })
      } catch (error) {
        return this.showError(error.message)
      }
    }
    let balance = 0
    let divisibility = 18 // for all EVM-based blockchains
    try {
      if (!this.method.contract)
        balance = this.web3.utils.toBN(
          await this.web3.eth.getBalance(addressfunc())
        )
      else {
        const contract = new this.web3.eth.Contract(
          this.abi[this.method.currency],
          this.method.contract
        )
        balance = this.web3.utils.toBN(
          await contract.methods.balanceOf(addressfunc()).call()
        )
        divisibility = await contract.methods.decimals().call()
      }
    } catch (error) {
      return this.showError(error.message)
    }
    const requiredAmount = this.web3.utils.toBN(
      this.$utils.toWei.call(this, this.dueAmount, divisibility)
    )
    this.loading = false
    if (balance.lt(requiredAmount)) this.insufficientBalance = true
    else {
      this.showMessage(true, `Connected to ${wallet}!`)
      await updateAddress(addressfunc())
      await this.$utils.payWithMetamask.call(this, addressfunc)
    }
  },
  async payWithMetamask(addressfunc) {
    this.loading = true
    let divisibility = 18
    let contract = null
    if (this.method.contract) {
      contract = new this.web3.eth.Contract(
        this.abi[this.method.currency],
        this.method.contract
      )
      divisibility = await contract.methods.decimals().call()
    }
    const requiredAmount = this.$utils.toWei.call(
      this,
      this.dueAmount,
      divisibility
    )
    try {
      if (!this.method.contract) {
        // usual tx
        await this.web3.eth.sendTransaction({
          to: this.method.payment_address,
          from: addressfunc(),
          value: requiredAmount,
        })
      } else {
        // contract payment
        await contract.methods
          .transfer(this.method.payment_address, requiredAmount)
          .send({ from: addressfunc() })
      }
    } catch (error) {
      this.showError(error.message)
    }
  },
  toWei(ether, unit) {
    const base = new this.web3.utils.BN(10).pow(new this.web3.utils.BN(unit))
    let [whole, fraction] = ether.split(".")
    if (!whole) whole = "0"
    if (!fraction) fraction = "0"
    while (fraction.length < unit) fraction += "0"
    whole = new this.web3.utils.BN(whole)
    fraction = new this.web3.utils.BN(fraction)
    const wei = whole.mul(base).add(fraction)
    return wei.toString(10)
  },
  toTitleCase(str) {
    str = str.replace(/_/g, " ")
    return str[0].toUpperCase() + str.substring(1)
  },
  getTxURL(txHash, currency) {
    if (!txHash) return
    const explorerURL = this.$store.state.policies.explorer_urls[currency]
    if (!explorerURL) return
    return explorerURL.replace(/{}/g, txHash)
  },
  getExtendSetting(name, defaults) {
    const extended = this.$store.state.dictionaries[name]
    if (Array.isArray(defaults)) return [...defaults, ...(extended || [])]
    else return Object.assign({}, defaults, extended || {})
  },
  emailPresets: [
    {
      title: "Gmail",
      command: {
        email_host: "smtp.gmail.com",
        email_port: 587,
        email_use_ssl: true,
      },
    },
    {
      title: "Yahoo",
      command: {
        email_host: "mail.yahoo.com",
        email_port: 587,
        email_use_ssl: true,
      },
    },
    {
      title: "Mailgun",
      command: {
        email_host: "smtp.mailgun.org",
        email_port: 587,
        email_use_ssl: true,
      },
    },
    {
      title: "Office365",
      command: {
        email_host: "smtp.office365.com",
        email_port: 587,
        email_use_ssl: true,
      },
    },
    {
      title: "SendGrid",
      command: {
        email_host: "smtp.sendgrid.net",
        email_port: 587,
        email_use_ssl: true,
      },
    },
  ],
  decimalStr(value, divisibility) {
    return parseFloat(value).toFixed(divisibility)
  },
  getDivisibility(valueStr) {
    const [, fractionAmount] = valueStr.split(".")
    return fractionAmount ? fractionAmount.length : 0
  },
  async transferNFT() {
    // const chainid = await this.web3.eth.getChainId()
    // chain ID is always MATIC 80001
    // const chainid = await this.web3.eth.getChainId()
    // TODO: Check if the chain id is equal gto the one received

    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    })

    const metamaskConnectedAccount = accounts[0]

    if (
      metamaskConnectedAccount.toLowerCase() !== this.fromAddress.toLowerCase()
    ) {
      this.isTransferLoading = false
      return this.showError(
        `Please change your Metamask account to the correct address`
      )
    }

    const contract = await new this.web3.eth.Contract(
      this.abiData,
      this.contractAddress
    )
    const tokenIdHex = this.web3.utils.toHex(this.nftObject.id.tokenId)

    const functionSignature = contract.methods
      .safeTransfer(
        this.fromAddress,
        this.toAddress,
        this.web3.utils.toBN(tokenIdHex)
      )
      .encodeABI()

    const gasPrice = await this.web3.eth.getGasPrice()

    const gasEstimate = await contract.methods
      .safeTransfer(this.fromAddress, this.toAddress, tokenIdHex)
      .estimateGas({ from: this.fromAddress })

    const transactionParameters = {
      to: contract.options.address,
      from: this.fromAddress,
      gasPrice: this.web3.utils.toHex(gasPrice),
      gas: this.web3.utils.toHex(gasEstimate),
      data: functionSignature,
    }

    // sign the transaction via MetaMask
    try {
      const txHash = await this.web3.eth.sendTransaction(transactionParameters)
      this.showMessage(true, "Voucher transfered successfully!")
      return { success: true, txHash }
    } catch (error) {
      this.showError(error.message)
      return { success: false, error }
    }
  },
  async deleteNFT() {
    const chainid = 80001
    const connectedChainID = await this.web3.eth.getChainId()

    if (chainid !== connectedChainID) {
      try {
        // Switch to Mumbai network (network ID 80001)
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }], // '0x13881' is the chain ID for Mumbai network
        })
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xf00",
                  chainName: "Mumbai",
                  rpcUrls: [
                    "https://matic-mumbai.chainstacklabs.com",
                  ] /* ... */,
                },
              ],
            })
          } catch (addError) {
            // handle "add" error
          }
        }
      }
    }
    const contract = await new this.web3.eth.Contract(
      this.abiData,
      this.contractAddress
    )

    const tokenIdHex = this.web3.utils.toHex(this.nft.id.tokenId)

    const functionSignature = contract.methods
      .burnToken(this.web3.utils.toBN(tokenIdHex))
      .encodeABI()

    const gasPrice = await this.web3.eth.getGasPrice()

    const gasEstimate = await contract.methods
      .burnToken(tokenIdHex)
      .estimateGas({ from: this.fromAddress })

    const transactionParameters = {
      to: contract.options.address,
      from: this.fromAddress,
      gasPrice: this.web3.utils.toHex(gasPrice),
      gas: this.web3.utils.toHex(gasEstimate),
      data: functionSignature,
    }

    try {
      const txHash = await this.web3.eth.sendTransaction(transactionParameters)
      return { success: true, txHash }
      // this.showMessage(true, "Voucher Deleted successfully")
    } catch (error) {
      console.log("Error transferring NFT: ", error)
      this.showError(error.message)
      return { success: false, error }
    }
  },

  async mintNFT(voucherURI) {
    const chainid = 80001
    const connectedChainID = await this.web3.eth.getChainId()
    if (chainid !== connectedChainID) {
      console.log("The chain id Is not Polygon")
      console.log(this.web3)

      try {
        // Switch to Mumbai network (network ID 80001)
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }], // '0x13881' is the chain ID for Mumbai network
        })
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xf00",
                  chainName: "Mumbai",
                  rpcUrls: [
                    "https://matic-mumbai.chainstacklabs.com",
                  ] /* ... */,
                },
              ],
            })
          } catch (addError) {
            // handle "add" error
          }
        }
      }
    }
    const contract = await new this.web3.eth.Contract(
      this.abiData,
      this.contractAddress
    )

    const address = window.ethereum.selectedAddress

    const functionSignature = contract.methods
      .safeMint(address, voucherURI)
      .encodeABI()

    const gasPrice = await this.web3.eth.getGasPrice()

    const gasEstimate = await contract.methods
      .safeMint(address, voucherURI)
      .estimateGas({ from: address })

    const transactionParameters = {
      to: contract.options.address,
      from: address,
      gasPrice: this.web3.utils.toHex(gasPrice),
      gas: this.web3.utils.toHex(gasEstimate),
      data: functionSignature,
    }

    try {
      const txHash = await this.web3.eth.sendTransaction(transactionParameters)
      return { success: true, txHash }
      // this.showMessage(true, "Voucher Deleted successfully")
    } catch (error) {
      // console.log("Error transferring NFT: ", error)
      this.showError(error.message)
      return { success: false, error }
    }
  },
}
