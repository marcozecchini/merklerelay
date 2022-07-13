const Web3 = require("web3");
const {BN, expectRevert, time, balance} = require('@openzeppelin/test-helpers');
const {createRLPHeader, calculateBlockHash, addToHex, createRLPValueState, createRLPNodeEncodeState} = require('../utils/utils');
const expectEvent = require('./expectEvent');
const RLP = require('rlp');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');


const { INFURA_TESTNET_ENDPOINT, INFURA_MAINNET_ENDPOINT } = require("../constant");

const MerkleRelay = artifacts.require('./MerkleRelay');
const EthashOwner = artifacts.require('./EthashOwner');
const {expect} = require('chai');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const GAS_PRICE_IN_WEI          = new BN(0);
const EPOCH                     = 493; //427; 
const GENESIS_BLOCK             = 14804381;// 12814531;  // block of the prove - 3
const LOCK_PERIOD               = time.duration.minutes(5);
expect(Math.floor(GENESIS_BLOCK / 30000), "genesis block not in epoch").to.equal(EPOCH);


contract('MerkleRelay', async(accounts) => {

    let merklerelay;
    let ethash;
    let mainWeb3;
    let sourceWeb3;

    before(async () => {
        mainWeb3 = new Web3(INFURA_MAINNET_ENDPOINT);

    });

    beforeEach(async () => {
        merklerelay = await MerkleRelay.new({
            from: accounts[0],
            gasPrice: GAS_PRICE_IN_WEI
        });
    });


    describe('MerkleRelay: MerkleTree functions', function() {
        it("it should successefully update the tree with an EVEN array of blocks", async () => {
            let elements = [];

            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+5)));

            const proofLeaves = elements.map(keccak256);
            const merkleTree = new MerkleTree(proofLeaves, keccak256);
            const root = merkleTree.getRoot();

            let ret = await merklerelay.updateTree(elements.map(Buffer.from), {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });

            console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

            ret = await merklerelay.getRoot();
            expect(ret).to.be.equal('0x'+root.toString('hex'));
        });

        it("it should successefully update the tree with an ODD array of blocks", async () => {
            let elements = [];

            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));

            const proofLeaves = elements.map(keccak256);
            const merkleTree = new MerkleTree(proofLeaves, keccak256);
            const root = merkleTree.getRoot();

            let ret = await merklerelay.updateTree(elements.map(Buffer.from), {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });
            console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

            ret = await merklerelay.getRoot();
            expect(ret).to.be.equal('0x'+root.toString('hex'));
        });

        it("it should successefully verify that a leaf belongs to the tree", async () => {
            let elements = [];

            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));

            const proofLeaves = elements.map(keccak256);
            const merkleTree = new MerkleTree(proofLeaves, keccak256);
            const root = merkleTree.getRoot();

            let ret = await merklerelay.updateTree(elements.map(Buffer.from), {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });

            ret = await merklerelay.getRoot();
            expect(ret).to.be.equal('0x'+root.toString('hex'));

            let proof = merkleTree.getProof(proofLeaves[1]);
            let proofSC = proof.map((el, i) => {return el.position == 'right' ?  {position: true, data: el.data} : {position: false, data: el.data}}); 
            let position_array = proofSC.map((el,i)=> {return el.position});
            let data_array = proofSC.map((el, i) => {return el.data});

            ret = await merklerelay.verifyBlock(data_array, position_array, elements[1], root, {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });
            
            expect(ret).to.be.equal(true);

        });

        it("it should NOT successefully verify that a leaf belongs to the tree", async () => {
            let elements = [];

            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));

            const proofLeaves = elements.map(keccak256);
            const merkleTree = new MerkleTree(proofLeaves, keccak256);
            const root = merkleTree.getRoot();

            let ret = await merklerelay.updateTree(elements.map(Buffer.from), {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });

            ret = await merklerelay.getRoot();
            expect(ret).to.be.equal('0x'+root.toString('hex'));

            let proof = merkleTree.getProof(proofLeaves[1]);
            let proofSC = proof.map((el, i) => {return el.position == 'right' ?  {position: true, data: el.data} : {position: false, data: el.data}}); 
            let position_array = proofSC.map((el,i)=> {return el.position});
            let data_array = proofSC.map((el, i) => {return el.data});

            ret = await merklerelay.verifyBlock(data_array, position_array, elements[0], root, {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });

            expect(ret).to.be.equal(false);

        });

        it("it should revert because data passed for verification are incorrect", async () => {
            let elements = [];

            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
            elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));

            const proofLeaves = elements.map(keccak256);
            const merkleTree = new MerkleTree(proofLeaves, keccak256);
            const root = merkleTree.getRoot();

            let ret = await merklerelay.updateTree(elements.map(Buffer.from), {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            });

            ret = await merklerelay.getRoot();
            expect(ret).to.be.equal('0x'+root.toString('hex'));

            let proof = merkleTree.getProof(proofLeaves[1]);
            let proofSC = proof.map((el, i) => {return el.position == 'right' ?  {position: true, data: el.data} : {position: false, data: el.data}}); 
            let position_array = proofSC.map((el,i)=> {return el.position});
            let data_array = proofSC.map((el, i) => {return el.data});

            await expectRevert(merklerelay.verifyBlock(data_array, position_array.slice(0,position_array.length-1), elements[1], root, {
                from: accounts[0],
                gas:3000000,
                gasPrice: GAS_PRICE_IN_WEI
            }), "proof and position have different length");

        });

    });
});

