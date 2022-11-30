import Web3 from 'web3';
import React, { Component } from 'react';
import ChatApp from '../abis/ChatApp.json'
import mainLogo from './arrow.png'
import JSEncrypt from 'jsencrypt'
import keyMap from './bipinkeys4.json'
class Chat extends Component {

    async componentWillMount() {
        await this.loadWeb3()
        await this.loadBlockchainData()
        await this.listenToMessages()
        await this.listenToEther()
        await this.listenToAskEther()
        await this.listenToFetchAllMsg()
        await this.fetchAllMsg()
        await this.updateUIData()
      }

    constructor(props) {
        super(props)
        let chats = [
            {
                msg: "This is a blockchain demo, try to tap in!",
                response: true
            },
            {
                msg: "Enter \"send_ether: 0.0001\" to send some tokens to your recipient 😃",
                response: false
            }
        ]
        this.state = {
            fixedChats: chats,
            chats: [],
            inputValue: '',
            accounts: [],
            account: '',
            nbBlocks: 0,
            otherAccount: '',
            accountNbTransactions: 0,
            otherAccountNbTransactions: 0,
            accountBalance: 0,
            otherAccountBalance: 0,
            lastGas: 0,
            blockHash: '',
            didATransaction: false,
            isLastTransactionSuccess: false,
            didARequest: false,
            accountRequesting: '',
            accountRequested: '',
            valueRequested: 0,
            account_keys : {},
            account_key_bits: {},
            placeholder: "Type here",

        }
    }

    // ------- init ------
    async loadWeb3() {
        if (window.ethereum) {
    
          // Need to put ws:// instead of http:// because of web sockets.
          // Web sockets are mandatory to listen to events.
          window.web3 = new Web3(Web3.providers.WebsocketProvider("ws://localhost:7545"))
          await window.ethereum.enable()
        }
        else if (window.web3) {
          window.web3 = new Web3(window.web3.currentProvider)
        }
        else {
          window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
        }
      }

    async loadBlockchainData()  {
        const web3 = window.web3
    
        const accounts = await web3.eth.getAccounts()
        this.setState({ 
            accounts: accounts,
            account: accounts[0],
            otherAccount: accounts[1]
         })
        console.log(accounts)

        var accLength = accounts.length;
        console.log("Number of Accounts: ", accLength)

        for( var i = 0; i < accLength; i++){

            this.state.account_keys[accounts[i]] = keyMap[i];
            
        }

        const ethBalance = await web3.eth.getBalance(this.state.account)
        this.setState({ ethBalance })
    
        // Load smart contract
        const networkId =  await web3.eth.net.getId()
        const chatAppData = ChatApp.networks[networkId]
        const abi = ChatApp.abi
        if(chatAppData) {
          const chatContract = new web3.eth.Contract(abi, chatAppData.address)
          this.setState({ chatContract: chatContract })
        }
        else {
            window.alert('Chat contract not deployed to detected network.')
        }
    }

    // ------- listeners ------
    async listenToMessages() {
        var binded = this.didReceiveMessageBinded.bind(this)
        this.state.chatContract.events.messageSentEvent({})
        .on('data', binded)
        .on('error', console.error);
    }

    async listenToEther() {
        var binded = this.didReceiveEtherBinded.bind(this)
        this.state.chatContract.events.etherSentEvent({})
        .on('data', binded)
        .on('error', console.error);
    }

    async listenToAskEther() {
        var binded = this.didReceiveAskEtherBinded.bind(this)
        this.state.chatContract.events.etherAskEvent({})
        .on('data', binded)
        .on('error', console.error);
    }

    async listenToFetchAllMsg() {
        var binded = this.didReceiveAllMsgBinded.bind(this)
        this.state.chatContract.events.messagesFetchedEvent({})
        .on('data', binded)
        .on('error', console.error);
    }

    decryptMessage(cipherText,acc, bits){
        var decryptor = new JSEncrypt();
        decryptor.setPrivateKey(this.state.account_keys[acc][bits][1]);
        var plainText = decryptor.decrypt(cipherText);

        return plainText;
    }

    async didReceiveMessageBinded(event){

        // console.log("Here")
        var message = event.returnValues.message
        console.log("Recieved Message: ", message)
        let cur_node = event.returnValues.to
        var de_msg = this.decryptMessage(message,cur_node,this.state.account_key_bits[cur_node])
        console.log("decrypted msg")
        console.log(de_msg)

        //TODO decrypt and send message
        let n_nodes = de_msg.split(",")
        console.log("Message split: ", n_nodes)
        // console.log("Recieved Cipher : ", n_nodes[n_nodes.length-1])
        

        // intermidiate node, so foward message
        if(this.state.accounts.indexOf(n_nodes[0]) > -1)
        {
            console.log("Intermediate node recived message " + cur_node)
            console.log("forwarding")
            this.didSendMessage(cur_node +"," +de_msg,false)
        }
        else
        {

            console.log("Final node recieved message ")
            console.log(n_nodes[0])
            message = n_nodes[0]

            // final message
            // message = n_nodes[1]
            // var plainText = this.decryptMessage(n_nodes[1],this.state.otherAccount)
            // console.log("Decrypted Message: ", plainText)
            // message = plainText
            console.log(message)
            console.log(event.returnValues.from)
            console.log(event.returnValues.to)
            if (event.returnValues.from === this.state.account){
                this.didReceiveMessage(message, true)
            }
            if (event.returnValues.to === this.state.account){
                this.didReceiveMessage(message, false)
            }
            this.setState({
                didATransaction: false,
                didARequest: false,
            })
            await this.updateUIData()
        }

        // if (event.returnValues.from === this.state.account){
        //     this.didReceiveMessage(plainText, true)
        // }
        // if (event.returnValues.to === this.state.account){
        //     this.didReceiveMessage(plainText, false)
        // }
        // this.setState({
        //     didATransaction: false,
        //     didARequest: false,
        // })
        // await this.updateUIData()
    }

    async didReceiveEtherBinded(event) {
        this.setState({
            didATransaction: true,
            didARequest: false,
            isLastTransactionSuccess: event.returnValues.success
        })
        // await this.wait()
        await this.updateUIData()
    }

    async didReceiveAskEtherBinded(event){
        if (this.state.account === event.returnValues.to) {
            let value_as_wei = window.web3.utils.fromWei(
                event.returnValues.value, "ether")
    
            this.setState({
                didATransaction: false,
                didARequest: true,
                accountRequesting: event.returnValues.from,
                accountRequested: event.returnValues.to,
                valueRequested: value_as_wei,
            })
            await this.updateUIData()
        }
    }

    async didReceiveAllMsgBinded(event){
        let allMsg = []

        event.returnValues.messages.forEach((message) => {
            allMsg.push({
                msg: this.decryptMessage(message['message'],this.state.otherAccount, 200),
                response: message['from'] === this.state.account
            })
        })
        if (allMsg.length === 0)
            allMsg = this.state.fixedChats

        this.setState({
            chats: allMsg
        })
        await this.updateUIData()
    }

    async didReceiveMessage(message, isResponse) {
        let chats = this.state.chats
        chats.push(
            {
                msg: message,
                response: isResponse
            }
        )
        this.setState({
            chats: chats,
            inputValue: ''
        })
        console.log(chats)
    }

    encryptMessage(message,acc, bits){

        console.log("In encrypt")
        var encryptor = new JSEncrypt();
        encryptor.setPublicKey(this.state.account_keys[acc][bits][0]);
        var cipherText = encryptor.encrypt(message);
        
        // console.log(cipherText)

        return cipherText;

    }

    makeOnion(nodes){

        nodes = nodes.reverse()
        var nLength = nodes.length
        var cipherText = nodes[0]
        var cipher_temp = ""
        var rsa = [200,800,1600,2600]
        for (var i = 1; i < nLength; i++){

            console.log("Onion layer: ",i)
            console.log("Encrypt for node: ", nodes[i])
            console.log(cipherText.length,  rsa[i-1])
            this.state.account_key_bits[nodes[i]] = rsa[i-1]
            cipher_temp = this.encryptMessage(cipherText, nodes[i], rsa[i-1])
            cipherText = nodes[i]+","+cipher_temp
            console.log(cipherText)
            
        }
        
        return cipherText


    }

    async didSendMessage(message,is_user_msg) {
        this.setState(
            {
                inputValue: "",
                placeholder: "Sent!",
            }
        )

        

        // Onion Routing

        var next_node = ""
        var cur_node = ""
        var cipherText = ""

        if(is_user_msg){


            let accounts = this.state.accounts
            
            // intermeditate nodes length
            let n_nodes_length = 3;
            let n_nodes = []

            //chose random nodes
            for (let i = 0; i < n_nodes_length; i++) {
                n_nodes.push(accounts[Math.floor(Math.random() * accounts.length)])
            }

            n_nodes.push(this.state.otherAccount)

            console.log("Node path")
            for (let node of n_nodes) {
                console.log(node);
            }

            // // Intercept Message and encrypt
            // var cipherText = this.encryptMessage(message,this.state.otherAccount)
            // console.log("Cipher Text : ",cipherText)

            
            
            message = n_nodes.toString() + "," + message
            console.log("The message " + message)
            next_node = n_nodes[0]
            // console.log("next node: " + next_node)
            cur_node = this.state.account

            // couple encryption with each node in onion
            let onion_nodes = message.split(',')
            let onion_length = onion_nodes.length
            console.log("onion: ", onion_nodes + "\n Onion length :" ,onion_length)

            cipherText = this.makeOnion(onion_nodes)
            cipherText = cipherText.split(",")[1]

            console.log("Cipher Text: ", cipherText)

        }
        else{

            let n_nodes = message.split(",")

            // node to send to next
            cur_node = n_nodes.shift()
            next_node = n_nodes.shift()
            cipherText = n_nodes.toString()

            console.log("Intermediate node")
            console.log("From: " + cur_node )
            console.log(" To: " + next_node)


        }

        // Intercept Message and encrypt


        this.state.chatContract.methods.sendMsg(next_node, cipherText)
            .send({ from: cur_node, gas: 1500000 })
        // await this.sendEtherIfAsked()
        // await this.askEtherIfAsked()
    }

    async sendEtherIfAsked() {
        let splitted = this.state.inputValue.split(':')
        if (splitted.length !== 2)
            return false

        if (splitted[0] == "send_ether" && this.isNumeric(splitted[1])) {
            let asWei = parseFloat(splitted[1]) * 1e18
            this.state.chatContract.methods.sendEther(this.state.otherAccount).send({
                from: this.state.account,
                value: asWei
            })
            return true
        }
        return false
    }

    async askEtherIfAsked() {
        let splitted = this.state.inputValue.split(':')
        if (splitted.length !== 2)
            return false

        if (splitted[0] == "ask_ether" && this.isNumeric(splitted[1])) {
            var asWei = (parseFloat(splitted[1]) * 1e18).toString()
            this.state.chatContract.methods.askEther(this.state.otherAccount, asWei).send({ from: this.state.account })
            return true
        }
        return false
    }

    async fetchAllMsg() {
        await this.state.chatContract.methods.getAllMsg(this.state.otherAccount).send({ from: this.state.account })
    }

    // ------- UI state updaters ------
    async updateUIData() {
        await this.updateNbTransactions()
        await this.updateBalances()
        await this.updateBlocks()
        // await this.updateLastGas()
    }

    updateInputValue(evt) {
        this.setState({
          inputValue: evt.target.value
        });
      }

    async updateAddressSelect(newValue, isOtherAccount) {
        if (isOtherAccount) {
            this.setState({
                otherAccount: newValue,
                chats: this.state.fixedChats
            })
        }
        else {
            this.setState({
                account: newValue,
                chats: this.state.fixedChats
            })
        }
        await this.wait()
        await this.fetchAllMsg()
        await this.updateUIData()
    }

    async updateNbTransactions() {
        let accountNbTransactions = await window.web3.eth.getTransactionCount(this.state.account)
        let otherAccountNbTransactions = await window.web3.eth.getTransactionCount(this.state.otherAccount)
        this.setState({
            accountNbTransactions: accountNbTransactions,
            otherAccountNbTransactions: otherAccountNbTransactions
        })
    }

    async updateBalances() {
        let accountBalance = await window.web3.eth.getBalance(this.state.account)
        let otherAccountBalance = await window.web3.eth.getBalance(this.state.otherAccount)
        this.setState({
            accountBalance: window.web3.utils.fromWei(accountBalance, 'ether'),
            otherAccountBalance: window.web3.utils.fromWei(otherAccountBalance, 'ether')
        })
    }

    async updateBlocks() {
        const latest = await window.web3.eth.getBlockNumber()
        this.setState({
            nbBlocks: latest
        })
    }

    async updateLastGas() {
        const lastBlockNumber = await window.web3.eth.getBlockNumber();
        let block = await window.web3.eth.getBlock(lastBlockNumber);
        block = await window.web3.eth.getBlock(lastBlockNumber);

        const lastTransaction = block.transactions[block.transactions.length - 1];
        const transaction = await window.web3.eth.getTransaction(lastTransaction);

        this.setState({
            blockHash: transaction["blockHash"],
            lastGas: transaction["gas"],
        })
    }

    // ------- UI ------
    getMessagesAsDivs() {
        let chatDivs = this.state.chats.map(x => x.response ? 
            <div class="message text-only">
                <div class="response">
                    <p class="text"> {x.msg} </p>
                    </div>
                </div> :
            <div class="message text-only">
                <p class="text"> {x.msg} </p>
            </div>
        )
        return chatDivs.reverse()
    }

    getToggleAdresses(isOtherAccount) {
        var addresses = []
        for (var i = 0; i < this.state.accounts.length; i++) {
            let account = this.state.accounts[i]
            if (isOtherAccount && account == this.state.otherAccount
                || !isOtherAccount && account == this.state.account)
                addresses.push(<option value={account} selected>{account}</option>)
            else {
                addresses.push(<option value={account}>{account}</option>)
            }
        }
        return addresses
    }

    displayEtherTransactionStatus() {
        if (!this.state.didATransaction)
            return

        if (this.state.isLastTransactionSuccess)
            return <div style={{color: "green"}}>ETH transaction succeeded!</div>
        else
            return <div>error</div>
    }

    displayAskEtherPopUp() {
        let to = this.state.accountRequested
        let valueAsEther = this.state.valueRequested
        let valueAsWei = parseFloat(this.state.valueRequested) * 1e18
        
        if (this.state.didARequest && to === this.state.account) {
            return (
            <div className="didAskContainer">
                <h6>Ether request</h6>
                <p>Account { to } requests you { valueAsEther } ether.</p>
                
                <button class="btn btn-success send-btn" onClick={() => this.state.chatContract.methods.sendEther(this.state.accountRequesting).send({
                    from: to,
                    value: valueAsWei
                })}>Accept</button>
            </div>
            )
        }
        return
    }

    // ------- helpers ------
    isNumeric(str) {
        if (typeof str != "string") return false
        return !isNaN(str) &&
               !isNaN(parseFloat(str))
      }

    async wait() {
        const noop = ()=>{};
        for (var i = 0; i < 10000; i++)
            noop()
    }

    // ------- rendering ------
    render() {
        return (
        <body>
            <div class ="center">
                <h1>ONION CHAIN PROJECT</h1>
            </div>
            <div class="block-container">
                <div class="row">
                    <div class="col-7 left-block">
                        <section class="chat">
                            <div class="header-chat">
                                <div class="left">
                                    <img src={mainLogo} class="arrow"/>
                                    <select class="custom-select" onChange={e => this.updateAddressSelect(e.target.value, false)} >
                                        { this.getToggleAdresses(false) }
                                    </select>     
                                </div>
                                <div class="right">
                                    <select class="custom-select" onChange={e => this.updateAddressSelect(e.target.value, true)} >
                                        { this.getToggleAdresses(true) }
                                    </select>  
                                </div>
                            </div>
                            <div class="messages-chat">
                            { this.getMessagesAsDivs() }
                            </div>
                        </section>
                        <div class="footer-chat">
                            <i class="icon fa fa-smile-o clickable" style={{fontSize: "25pt"}} aria-hidden="true"></i>
                            <input value={this.state.inputValue} onChange={evt => this.updateInputValue(evt)} type="text" class="write-message" placeholder= {this.state.placeholder}></input>
                            <i class="icon send fa fa-paper-plane-o clickable" aria-hidden="true"></i>
                            <button class="btn btn-success send-btn" onClick={() => this.didSendMessage(this.state.inputValue,true)}>Send</button>
                        </div>
                    </div>
                    <div class="col-5 right-block">
                        <h3>Blockchain state</h3>
                        <p>Number of blocks: { this.state.nbBlocks }</p>
                        <div class="sender-block blockchain-block">
                            <p><b>Sender address:</b></p>
                            <p>{ this.state.account }</p>
                            <p>Number of transactions: { this.state.accountNbTransactions }</p>
                            <p>Wallet balance: { this.state.accountBalance } ETH</p>
                        </div>
                        <div class="recip-block blockchain-block">
                            <p><b>Recipient address:</b></p>
                            <p>{ this.state.otherAccount }</p>
                            <p>Number of transactions: { this.state.otherAccountNbTransactions }</p>
                            <p>Wallet balance: { this.state.otherAccountBalance } ETH</p>
                        </div>

                        <div class="alert-transac">
                            { this.displayEtherTransactionStatus() }
                        </div>
                        <div class="alert-request">
                            { this.displayAskEtherPopUp() }
                        </div>
                        
                    </div>
                </div>
                
                </div>
        </body>)
    }

}

export default Chat;