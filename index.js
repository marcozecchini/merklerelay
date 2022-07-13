const MP = require('merkle-patricia-tree')
const Trie = MP.SecureTrie;
const RLP = require('rlp');

const trie = new Trie();

async function test() {
    await trie.put(Buffer.from('test'), Buffer.from('one'))
    await trie.put(Buffer.from('tess'), Buffer.from('two'))
    await trie.put(Buffer.from('test1'), Buffer.from('three'))

    const proof = await Trie.createProof(trie, Buffer.from('test1'))
    const value = await Trie.verifyProof(trie.root, Buffer.from('test1'), proof)
    // console.log(proof[proof.length-1].indexOf(value), proof[proof.length-1].slice(0,proof[proof.length-1].indexOf(value)))
    // proof[proof.length-1] = proof[proof.length-1].slice(0,proof[proof.length-1].indexOf(value)) // Se devo separare proof e value
    console.log(RLP.encode(proof), RLP.encode(value), trie.root.toString('hex')); // 'one'
  }
  
  test()