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
            placeholder: "Type Here",

        }
    }

    // Initilizations 
    async loadWeb3() {
        if (window.ethereum) {
    
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

    // listeners 
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
        var n_nodes
        var message = event.returnValues.message
        console.log("Cipher Recieved !!! ")
        var ethnodes = message.split(',')
        // console.log("Ether nodes: ",ethnodes)
        if(ethnodes[ethnodes.length-1].split(':')[0] == 'send_ether'){
            var is_sendEther = true
        }

        let cur_node = event.returnValues.to
        if(!is_sendEther){

            var de_msg = this.decryptMessage(message,cur_node,this.state.account_key_bits[cur_node])
            console.log("Decrypted Cipher (next_node,cipherText): ",de_msg)

        //TODO decrypt and send message
            n_nodes = de_msg.split(",")
        }
        else{
            n_nodes = ethnodes
        }
        
        // console.log("Decrypted Message (next_node,cipherText): ", n_nodes)
        // console.log("Recieved Cipher : ", n_nodes[n_nodes.length-1])
        

        // intermidiate node, so foward message
        if(this.state.accounts.indexOf(n_nodes[0]) > -1)
        {
            console.log("At Intermediate node: " + cur_node)
            console.log("Forwarding..........")
            if(!is_sendEther){
                this.didSendMessage(cur_node +"," +de_msg,false)
            }
            else{
                this.didSendMessage(message,false)
            }
            
        }
        else
        {

            console.log("Final node recieved message !!!")
            // console.log(n_nodes[0])
            message = n_nodes[0]

            // final message
            // message = n_nodes[1]
            // var plainText = this.decryptMessage(n_nodes[1],this.state.otherAccount)
            // console.log("Decrypted Message: ", plainText)
            // message = plainText
            console.log("Decrypted PlainText: ",message)
            console.log("Last Sender",event.returnValues.from)
            console.log("Reciever",event.returnValues.to)
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

        // console.log("In encrypt")
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

            console.log("For layer: ",i)
            console.log("Encrypt for node: ", nodes[i])
            

            this.state.account_key_bits[nodes[i]] = rsa[i-1]
            cipher_temp = this.encryptMessage(cipherText, nodes[i], rsa[i-1])
            console.log("Encrypted Cipher size(Bytes) : ",cipher_temp.length)
            cipherText = nodes[i]+","+cipher_temp
            
            
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

            var is_sendEther = false
            let accounts = this.state.accounts
            
            // intermeditate nodes length
            let n_nodes_length = 3;
            let n_nodes = []

            //chose random nodes
            var count = 0
            while(count<n_nodes_length){
                var interNode = accounts[Math.floor(Math.random() * accounts.length)]
                console.log("Original Sender: ",this.state.account + "\nReciever: ",this.state.otherAccount)
                if(!n_nodes.includes(interNode) && interNode!=this.state.account && interNode!=this.state.otherAccount){
                    n_nodes.push(interNode)
                    count++
                }

            }

            n_nodes.push(this.state.otherAccount)

            console.log("Node path")
            for (let node of n_nodes) {
                console.log(node);
            }

            
            //set is_ether flag
            var check_ether = message.split(':')
            console.log("Debug: ",check_ether)
            if (check_ether[0] == "send_ether"){
                is_sendEther = true
            }



            message = n_nodes.toString() + "," + message

            console.log("Path wrapped message to make Onion " + message)
            next_node = n_nodes[0]
            // console.log("next node: " + next_node)
            cur_node = this.state.account

            // couple encryption with each node in onion

            if(!is_sendEther){
                let onion_nodes = message.split(',')
                let onion_length = onion_nodes.length
                console.log("\nOnion layers :" ,onion_length)

                cipherText = this.makeOnion(onion_nodes)
                cipherText = cipherText.split(",")[1]

                console.log("\nOnion Cipher Text: ", cipherText)

            }
            else{
                cipherText = message
                console.log("Encrypt route: ", message)
            }
        }
        else{

            let n_nodes = message.split(",")
            // console.log("Debug: ",n_nodes)
            // node to send to next
            cur_node = n_nodes.shift()
            if(!is_sendEther){
                next_node = n_nodes.shift()
            }
            else{
                next_node = n_nodes[0]
            }
            
            cipherText = n_nodes.toString()

            // console.log("Intermediate node")
            // console.log("\nFrom: " + cur_node )
            console.log("\nTo: " + next_node)


        }

        // Intercept Message and encrypt


        this.state.chatContract.methods.sendMsg(next_node, cipherText)
            .send({ from: cur_node, gas: 1500000 })
        await this.sendEtherIfAsked(is_user_msg,cur_node,next_node,cipherText)
    }

    async sendEtherIfAsked(cur_node,next_node,message) {
        
        let n_nodes = message.split(',')
        // console.log("sendEth Info: ", n_nodes)
        let splitted = n_nodes[n_nodes.length-1].split(':')
        // console.log("Splitted info: ",splitted)
        if (splitted.length !== 2)
            return false

        if (splitted[0] == "send_ether" && this.isNumeric(splitted[1])) {
            console.log("Sending Etherum ;")
            console.log("Ether Sent : ",cur_node + " to : ",next_node)
            let asWei = parseFloat(splitted[1]) * 1e18
            this.state.chatContract.methods.sendEther(next_node).send({
                from: cur_node,
                value: asWei
            })
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
            <div class = "center">
                <h1>Onion Chain Messenger</h1>
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
                            <input value={this.state.inputValue} onChange={evt => this.updateInputValue(evt)} type="text" class="write-message" placeholder={this.state.placeholder}></input>
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
                    
                        
                    </div>
                </div>
                
                </div>
        </body>)
    }

}

export default Chat;