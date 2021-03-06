const Web3 = require("web3");
const {BN, expectRevert, time, balance} = require('@openzeppelin/test-helpers');
const {createRLPHeader, calculateBlockHash, addToHex, createRLPValueState, createRLPNodeEncodeState} = require('../utils/utils');
const expectEvent = require('./expectEvent');
const RLP = require('rlp');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');


const { INFURA_TESTNET_ENDPOINT, INFURA_MAINNET_ENDPOINT } = require("../constant");

const MerkleRelay = artifacts.require('./MerkleRelayTestContract');
const MerkleTreeTest = artifacts.require('./MerkleTreeTest');
const EthashOwner = artifacts.require('./EthashOwner');
const {expect} = require('chai');
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const ZERO_HASH                 = '0x0000000000000000000000000000000000000000000000000000000000000000';const LOCK_PERIOD               = time.duration.minutes(5);
const ALLOWED_FUTURE_BLOCK_TIME = time.duration.seconds(15);
const MAX_GAS_LIMIT             = 2n ** 63n - 1n;
const MIN_GAS_LIMIT             = 5000;
const GAS_PRICE_IN_WEI          = new BN(0);
const EPOCH                     = 493; //427; 
const GENESIS_BLOCK             = 14804381;// 12814531;  // block of the prove - 3
expect(Math.floor(GENESIS_BLOCK / 30000), "genesis block not in epoch").to.equal(EPOCH);


const EPOCHFILE = "./pow/epoch.json";
const DATAPOWFILE = "./pow/genesisPlus2.json";


contract('MerkleRelay', async(accounts) => {

    let merklerelay;
    let ethash;
    let mainWeb3;
    let sourceWeb3;

    

    describe('MerkleRelay: MerkleTree functions', function() {

        before(async () => {
            mainWeb3 = new Web3(INFURA_MAINNET_ENDPOINT);
    
        });
    
        beforeEach(async () => {
            merklerelay = await MerkleTreeTest.new({
                from: accounts[0],
                gasPrice: GAS_PRICE_IN_WEI
            });
        });
    
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

        describe('Merklerelay: DepositStake', function () {
            before(async () => {
                mainWeb3 = new Web3(INFURA_MAINNET_ENDPOINT);
                ethash = await EthashOwner.new();
                // const epochData = require(EPOCHFILE);
        
                // console.log(`Submitting data for epoch ${EPOCH} to Ethash contract...`);
                // await submitEpochData(ethash, EPOCH, epochData.FullSizeIn128Resolution, epochData.BranchDepth, epochData.MerkleNodes);
                // console.log("Submitted epoch data.");
        
            });
        
            beforeEach(async () => {
                const genesisBlock = await mainWeb3.eth.getBlock(GENESIS_BLOCK);
                const genesisRlpHeader = createRLPHeader(genesisBlock);
        
                merklerelay = await MerkleRelay.new(genesisRlpHeader, genesisBlock.totalDifficulty, ethash.address, {
                    from: accounts[0],
                    gasPrice: GAS_PRICE_IN_WEI
                });
            });

            // Test Scenario 1:
            it("should throw error: transfer amount not equal to function parameter", async () => {
                const stake = new BN(1);
                await expectRevert(
                    merklerelay.depositStake(stake, {
                        from: accounts[0],
                        value: stake.add(new BN(1)),
                        gasPrice: GAS_PRICE_IN_WEI
                    }),
                    "transfer amount not equal to function parameter");
            });
    
            // Test Scenario 2:
            it("should correctly add the provided stake to the client's balance", async () => {
                const stake = new BN(15);
                const balanceBeforeCall = await merklerelay.getStake({from: accounts[0]});
    
                await merklerelay.depositStake(stake, {from: accounts[0], value: stake});
                const balanceAfterCall = await merklerelay.getStake({from: accounts[0]});
    
                expect(balanceAfterCall).to.be.bignumber.equal(balanceBeforeCall.add(stake));

                await merklerelay.withdrawStake(stake, {from: accounts[0]});
                const balanceAfterCallBis = await merklerelay.getStake({from: accounts[0]});
    
                expect(balanceAfterCallBis).to.be.bignumber.equal(balanceBeforeCall);
                
            });
    
        });

        describe('MerkleRelay: MerkleTree submission', function() {
            before(async () => {
                mainWeb3 = new Web3(INFURA_MAINNET_ENDPOINT);
                ethash = await EthashOwner.new();
                const epochData = require(EPOCHFILE);
        
                console.log(`Submitting data for epoch ${EPOCH} to Ethash contract...`);
                await submitEpochData(ethash, EPOCH, epochData.FullSizeIn128Resolution, epochData.BranchDepth, epochData.MerkleNodes);
                console.log("Submitted epoch data.");
        
            });
        
            beforeEach(async () => {
                const genesisBlock = await mainWeb3.eth.getBlock(GENESIS_BLOCK);
                const genesisRlpHeader = createRLPHeader(genesisBlock);
        
                merklerelay = await MerkleRelay.new(genesisRlpHeader, genesisBlock.totalDifficulty, ethash.address, {
                    from: accounts[0],
                    gasPrice: GAS_PRICE_IN_WEI
                });
            });
        
            it("it should correctly submit the new root of 4 elements", async () => {
                const stake = await merklerelay.getRequiredStakePerRoot();
                await merklerelay.depositStake(stake, {
                    from: accounts[0],
                    value: stake,
                    gasPrice: GAS_PRICE_IN_WEI
                });

                let elements = [];
                let genesisBlock = (await mainWeb3.eth.getBlock(GENESIS_BLOCK));

                elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+1)));
                elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+2)));
                elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+3)));
                elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+4)));

                const proofLeaves = elements.map(keccak256);
                const merkleTree = new MerkleTree(proofLeaves, keccak256);
                const root = merkleTree.getHexRoot();

                let ret = await merklerelay.submitRoot(elements.map(Buffer.from), genesisBlock.hash, {
                    from: accounts[0],
                    gas:3000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: root});
                await merklerelay.withdrawStake(stake, {from: accounts[0]});

            });

            it("it should correctly submit the new root of MANY elements", async () => {
                const stake = await merklerelay.getRequiredStakePerRoot();
                await merklerelay.depositStake(stake, {
                    from: accounts[0],
                    value: stake,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                let elements = [];
                let genesisBlock = (await mainWeb3.eth.getBlock(GENESIS_BLOCK));

                for (let i = 1; i <= 64; i++) 
                    elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+i)));
                
                const proofLeaves = elements.map(keccak256);
                const merkleTree = new MerkleTree(proofLeaves, keccak256);
                const root = merkleTree.getHexRoot();

                let ret = await merklerelay.submitRoot(elements.map(Buffer.from), genesisBlock.hash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: root});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);
                await merklerelay.withdrawStake(stake, {from: accounts[0]});
                
            });

            // Test Scenario 3:
            //
            // (0)---(1)---(2)---(3)
            //
            it("it should correctly submit test scenario 3", async () => {
                const requiredStakePerRoot = await merklerelay.getRequiredStakePerRoot();
                const stake = requiredStakePerRoot.mul(new BN(3));
                await merklerelay.depositStake(stake, {
                    from: accounts[0],
                    value: stake,
                    gasPrice: GAS_PRICE_IN_WEI
                });

                let genesisBlock = (await mainWeb3.eth.getBlock(GENESIS_BLOCK));
                let parentHash = genesisBlock.hash;
                let elements = [];
                let expectedRoots = [];

                for (let root_index = 0; root_index < 3; root_index++){
                    elements = [];
                

                    for (let i = 1; i <= 16; i++) 
                        elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+i+root_index*16)));
                    
                    const proofLeaves = elements.map(keccak256);
                    const merkleTree = new MerkleTree(proofLeaves, keccak256);
                    const root = merkleTree.getHexRoot();

                    let ret = await merklerelay.submitRoot(elements.map(Buffer.from), parentHash, {
                        from: accounts[0],
                        gas: 20000000,
                        gasPrice: GAS_PRICE_IN_WEI
                    });
                    
                    expectEvent.inLogs(ret.logs, 'NewRoot', {root: root});
                    console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

                    parentHash = root;

                    // create an array of expectedRoots
                    const submitTime = await time.latest();
                    if (root_index > 0) expectedRoots[root_index-1].successors.push(parentHash);
                    expectedRoots.push(
                        {
                            hash: root,
                            lastHash: '0x'+keccak256(elements[elements.length-1]).toString('hex'),
                            number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length+root_index*16)).number,
                            totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length+root_index*16)).totalDifficulty,
                            lengthUpdate: elements.length,
                            forkId: 0,
                            iterableIndex: 0,
                            latestFork: ZERO_HASH,
                            lockedUntil: submitTime.add(LOCK_PERIOD),
                            submitter: accounts[0],
                            successors: []
                        }
                    )
                }
                
                await withdrawStake(stake, accounts[0]);

                await checkExpectedRoots(expectedRoots);
                await checkExpectedEndpoints([expectedRoots[expectedRoots.length-1]]);
                
            });

            // Test Scenario 4:
            //
            //      -(1)
            //    /
            // (0)
            //    \
            //      -(2)
            //
            it("it should correctly submit test scenario 4", async () => {
                const requiredStakePerRoot = await merklerelay.getRequiredStakePerRoot();
                const stake = requiredStakePerRoot.mul(new BN(2));
                let expectedRoots = [];
                await merklerelay.depositStake(stake, {
                    from: accounts[0],
                    value: stake,
                    gasPrice: GAS_PRICE_IN_WEI
                });

                let genesisBlock = (await mainWeb3.eth.getBlock(GENESIS_BLOCK));
                let parentHash = genesisBlock.hash;
                let elements = [];

                // Add (1)
                for (let i = 1; i <= 16; i++) 
                    elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+i)));
                    
                const proofLeaves = elements.map(keccak256);
                const merkleTree = new MerkleTree(proofLeaves, keccak256);
                const root = merkleTree.getHexRoot();

                let ret = await merklerelay.submitRoot(elements.map(Buffer.from), parentHash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: root});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);
                let submitTime = await time.latest();
                expectedRoots.push(
                    {
                        hash: root,
                        lastHash: '0x'+keccak256(elements[elements.length-1]).toString('hex'),
                        number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).number,
                        totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).totalDifficulty,
                        lengthUpdate: elements.length,
                        forkId: 0,
                        iterableIndex: 0,
                        latestFork: parentHash, //also the latestFork of the previous node must be set to parentHash
                        lockedUntil: submitTime.add(LOCK_PERIOD),
                        submitter: accounts[0],
                        successors: []
                    }
                );

                // Add (2)
                let block1 = await mainWeb3.eth.getBlock(GENESIS_BLOCK+1);
                let block16 = await mainWeb3.eth.getBlock(GENESIS_BLOCK+16);
                block16.transactionsRoot = block1.receiptsRoot;
                block16.stateRoot = block1.transactionsRoot;
                block16.receiptsRoot = block1.stateRoot;
                block16.hash = calculateBlockHash(block16);
                elements[15] = createRLPHeader(block16);
                
                const proofLeavesBis = elements.map(keccak256);
                const merkleTreeBis = new MerkleTree(proofLeavesBis, keccak256);
                const rootBis = merkleTreeBis.getHexRoot();

                ret = await merklerelay.submitRoot(elements.map(Buffer.from), parentHash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });

                expectEvent.inLogs(ret.logs, 'NewRoot', {root: rootBis});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

                submitTime = await time.latest();
                expectedRoots.push(
                    {
                        hash: rootBis,
                        lastHash: '0x'+keccak256(elements[15]).toString('hex'),
                        number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).number,
                        totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).totalDifficulty,
                        lengthUpdate: elements.length,
                        forkId: 1,
                        iterableIndex: 1,
                        latestFork: parentHash,
                        lockedUntil: submitTime.add(LOCK_PERIOD),
                        submitter: accounts[0],
                        successors: []
                    }
                );
                
                await checkExpectedRoots(expectedRoots);
                await checkExpectedEndpoints(expectedRoots);

                await withdrawStake(stake, accounts[0]);
            });

            // Test Scenario 5:
            //
            //      -(1)---(2)
            //    /
            // (0)
            //    \
            //      -(3)
            //
            it("it should correctly submit test scenario 5", async () => {
                const requiredStakePerRoot = await merklerelay.getRequiredStakePerRoot();
                const stake = requiredStakePerRoot.mul(new BN(3));
                await merklerelay.depositStake(stake, {
                    from: accounts[0],
                    value: stake,
                    gasPrice: GAS_PRICE_IN_WEI
                });

                let genesisBlock = (await mainWeb3.eth.getBlock(GENESIS_BLOCK));
                let parentHash = genesisBlock.hash;
                let elements = [];
                let expectedRoots = [];

                // Add (1)
                for (let i = 1; i <= 16; i++) 
                    elements.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+i)));
                    
                const proofLeaves = elements.map(keccak256);
                const merkleTree = new MerkleTree(proofLeaves, keccak256);
                const root = merkleTree.getHexRoot();

                let ret = await merklerelay.submitRoot(elements.map(Buffer.from), parentHash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: root});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);
                
                let submitTime = await time.latest();
                expectedRoots.push(
                    {
                        hash: root,
                        lastHash: '0x'+keccak256(elements[elements.length-1]).toString('hex'),
                        number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).number,
                        totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).totalDifficulty,
                        lengthUpdate: elements.length,
                        forkId: 0,
                        iterableIndex: 0,
                        latestFork: parentHash,
                        lockedUntil: submitTime.add(LOCK_PERIOD),
                        submitter: accounts[0],
                        successors: []
                    }
                );
                parentHash = root;

                // Add (2)
                let elementsBis = [];
                for (let i = 1; i <= 16; i++) 
                    elementsBis.push(createRLPHeader(await mainWeb3.eth.getBlock(GENESIS_BLOCK+i+16)));
                    
                const proofLeavesBis = elementsBis.map(keccak256);
                const merkleTreeBis = new MerkleTree(proofLeavesBis, keccak256);
                const rootBis = merkleTreeBis.getHexRoot();

                ret = await merklerelay.submitRoot(elementsBis.map(Buffer.from), parentHash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: rootBis});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

                submitTime = await time.latest();
                expectedRoots[0].successors.push(rootBis);
                expectedRoots.push(
                    {
                        hash: rootBis,
                        lastHash: '0x'+keccak256(elementsBis[elementsBis.length-1]).toString('hex'),
                        number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elementsBis.length+elements.length)).number,
                        totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elementsBis.length+elements.length)).totalDifficulty,
                        lengthUpdate: elementsBis.length,
                        forkId: 0,
                        iterableIndex: 0,
                        latestFork: genesisBlock.hash, //also the latestFork of the previous node must be set to parentHash
                        lockedUntil: submitTime.add(LOCK_PERIOD),
                        submitter: accounts[0],
                        successors: []
                    }
                );

                // Add (3)
                parentHash = genesisBlock.hash;

                let block1 = await mainWeb3.eth.getBlock(GENESIS_BLOCK+1);
                let block16 = await mainWeb3.eth.getBlock(GENESIS_BLOCK+16);
                block16.transactionsRoot = block1.receiptsRoot;
                block16.stateRoot = block1.transactionsRoot;
                block16.receiptsRoot = block1.stateRoot;
                block16.hash = calculateBlockHash(block16);
                elements[15] = createRLPHeader(block16);
                
                const proofLeavesTris = elements.map(keccak256);
                const merkleTreeTris = new MerkleTree(proofLeavesTris, keccak256);
                const rootTris = merkleTreeTris.getHexRoot();

                ret = await merklerelay.submitRoot(elements.map(Buffer.from), parentHash, {
                    from: accounts[0],
                    gas: 20000000,
                    gasPrice: GAS_PRICE_IN_WEI
                });
                
                expectEvent.inLogs(ret.logs, 'NewRoot', {root: rootTris});
                console.log("Gas used for updating the tree:", ret.receipt.gasUsed);

                submitTime = await time.latest();
                expectedRoots.push(
                    {
                        hash: rootTris,
                        lastHash: '0x'+keccak256(elements[15]).toString('hex'),
                        number: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).number,
                        totalDifficulty: (await mainWeb3.eth.getBlock(GENESIS_BLOCK+elements.length)).totalDifficulty,
                        lengthUpdate: elements.length,
                        forkId: 1,
                        iterableIndex: 1,
                        latestFork: parentHash,
                        lockedUntil: submitTime.add(LOCK_PERIOD),
                        submitter: accounts[0],
                        successors: []
                    }
                );

                await checkExpectedRoots(expectedRoots);
                await checkExpectedEndpoints([expectedRoots[1], expectedRoots[2]]);
                
                await withdrawStake(stake, accounts[0]);
            });

        });

    });

    // checks if expectedEndpoints array is correct and if longestChainEndpoints contains hash of block with highest difficulty
    const checkExpectedEndpoints = async (expectedEndpoints) => {
        expect(await merklerelay.getNumberOfForks()).to.be.bignumber.equal(new BN(expectedEndpoints.length));

        let expectedLongestChainEndpoint = expectedEndpoints[0];
        await asyncForEach(expectedEndpoints, async (expected, index) => {
            expect(await merklerelay.getEndpoint(index)).to.equal(expected.hash);
            if (expectedLongestChainEndpoint.totalDifficulty < expected.totalDifficulty) {
                expectedLongestChainEndpoint = expected;
            }
        });

        expect(await merklerelay.getLongestChainEndpoint()).to.equal(expectedLongestChainEndpoint.hash);
    };

    const checkExpectedRoots = async (expectedRoots) => {
        await asyncForEach(expectedRoots, async expected => {
            // check header data
            const actualRoot = await merklerelay.getExtendedRootMetadata(expected.hash);
            assertRootEqual(actualRoot, expected);
        });
    };

    const getAccountBalanceInWei = async (accountAddress) => {
        return await balance.current(accountAddress);
    };

    const withdrawStake = async (stake, accountAddr) => {
        const submitTime = await time.latest();
        const increasedTime = submitTime.add(LOCK_PERIOD).add(time.duration.seconds(1));
        await time.increaseTo(increasedTime);  // unlock all blocks
        await merklerelay.withdrawStake(stake, {from: accountAddr, gasPrice: GAS_PRICE_IN_WEI});
    };

    const assertRootEqual = (actual, expected) => {
        expect(actual.blockNumber).to.be.bignumber.equal(new BN(expected.number));
        expect(actual.lengthUpdate).to.be.bignumber.equal(new BN(expected.lengthUpdate));
        expect(actual.forkId).to.be.bignumber.equal(new BN(expected.forkId));
        expect(actual.iterableIndex).to.be.bignumber.equal(new BN(expected.iterableIndex));
        expect(actual.lockedUntil).to.be.bignumber.equal(expected.lockedUntil);
        expect(actual.successors).to.deep.equal(expected.successors);
        expect(actual.submitter).to.equal(expected.submitter);
        expect(actual.latestFork).to.equal(expected.latestFork);
        expect(actual.lastHash).to.equal(expected.lastHash);
    };
    
    
    const asyncForEach = async (array, callback) => {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    };

    const submitEpochData = async (ethashContractInstance, epoch, fullSizeIn128Resolution, branchDepth, merkleNodes) => {
        let start = new BN(0);
        let nodes = [];
        let mnlen = 0;
        let index = 0;
        for (let mn of merkleNodes) {
            nodes.push(mn);
            if (nodes.length === 40 || index === merkleNodes.length - 1) {
                mnlen = new BN(nodes.length);
    
                if (index < 440 && epoch === 128) {
                    start = start.add(mnlen);
                    nodes = [];
                    return;
                }
    
                await ethashContractInstance.setEpochData(epoch, fullSizeIn128Resolution, branchDepth, nodes, start, mnlen);
    
                start = start.add(mnlen);
                nodes = [];
            }
            index++;
        }
    };
});