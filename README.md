# ONION CHAIN MESSENGER

 

## Usage

1) Start Ganache server

2) Connect Metamask wallet to Ganache Server

3) In terminal, run “truffle migrate” (to migrate smart contracts)

4) In terminal, run “npm start” (to deploy webapp)

5) Webapp is running on localhost:3000

 

## Libraries used

Web3

JSEncrypt

React

Ganache

Truffle

 

Python libs for keygen

rsa

json

 

## Key methods can be found in

src/components/Chat.js

 

1) decryptMessage(cipherText,acc, bits): Decrypts CipherText at each layer

2) async didReceiveMessageBinded(event): Receives, Decrypts and routes
intermediate cipherText

3) encryptMessage(message,acc, bits): Encrypts using public key of specified
node

4) makeOnion(nodes): Append next node address and re-encrypt recursively to
create onion CipherText

5) async didSendMessage(message,is_user_msg): Receives, Encrypts and makes onion
CipherText to be forwarded

6) async sendEtherIfAsked(cur_node,next_node,message): Recieves and routes
ethereum using onion route

## Features
* connect to all the available wallet addresses available in Ganache
* send messages between these addresses
* store all the messages in the smart contract in order to fetch them back when the page is reloaded
* monitor the state of the blockchain in real time when the transactions are executed
* send ethereum between the addresses
