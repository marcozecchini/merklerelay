// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

 
import "./libraries/MerklePatriciaProof.sol";
import "./libraries/RLPReader.sol";


contract PatriciaMerkleRelay {
    bytes32 public previousRoot;
    bytes32 public root = "";
    using RLPReader for *;

    constructor() {}
    
    event rootUpdated(bytes32 oldroot, bytes32 newroot);

    function updateTree(bytes memory rlpEncodedValue,
        bytes memory path, bytes memory rlpEncodedNodes, bytes32 merkleRootHash) public {
        
        if (MerklePatriciaProof.verify(rlpEncodedValue, path, rlpEncodedNodes, merkleRootHash) > 0) {
            return;
        }

        emit rootUpdated(root, merkleRootHash);        
        previousRoot = root;
        root = merkleRootHash;
    }
    
    event db (bytes rlpEncodedValue, bytes path, bytes rlpEncodedNodes, bytes32 merkleRootHash);
    
    function updateBatchTree(bytes[] memory rlpEncodedValues, bytes[] memory path, 
        bytes[] memory rlpEncodedNodes, bytes32 merkleRootHash) public {
        

        for (uint i = 0; i < merkleRootHash.length; i++){
            emit db(rlpEncodedValues[i], path[i], rlpEncodedNodes[i], merkleRootHash[i]);
            if (MerklePatriciaProof.verify(rlpEncodedValues[i], path[i], rlpEncodedNodes[i], merkleRootHash) > 0) {
                return;
            }
        }

        emit rootUpdated(root, merkleRootHash[merkleRootHash.length-1]);        
        previousRoot = root;
        root = merkleRootHash;
    }

    function getRoot() public view returns (bytes32){
        return root;
    }
        
}