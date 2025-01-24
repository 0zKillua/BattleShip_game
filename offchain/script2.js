const { MerkleTree } = require('merkletreejs');
const { ethers } = require('ethers');

// Predefined Boards
const BOARD_1 = [
    [1,1,1,1,1,0,0,0,0,0], // 5-length ship (row 0)
    [1,1,1,1,0,0,0,0,0,0], // 4-length ship (row 1)
    [1,1,1,0,0,0,0,0,0,0], // 3-length ship (row 2)
    [1,1,1,0,0,0,0,0,0,0], // 3-length ship (row 3)
    [1,1,0,0,0,0,0,0,0,0], // 2-length ship (row 4)
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ];
  
  const BOARD_2 = [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,0], // 5-length ship (row 2)
    [0,0,0,0,1,1,1,1,0,0], // 4-length ship (row 3)
    [0,0,0,0,1,1,1,0,0,0], // 3-length ship (row 4)
    [0,0,0,0,1,1,1,0,0,0], // 3-length ship (row 5)
    [0,0,0,0,1,1,0,0,0,0], // 2-length ship (row 6)
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ];
  
function generateMerkleTree(board, masterSalt) {
  const leaves = board.flat().map((hit, index) => {
    const x = Math.floor(index / 10);
    const y = index % 10;
    const cellSalt = ethers.utils.solidityKeccak256(['bytes32', 'uint8', 'uint8'], [masterSalt, x, y]);
    return ethers.utils.solidityKeccak256(['uint8', 'bytes32'], [hit, cellSalt]);
  });
  return new MerkleTree(leaves, ethers.utils.keccak256, { sort: true });
}

const MASTER_SALT_BOARD_1 = ethers.utils.formatBytes32String('board1_salt');
const MASTER_SALT_BOARD_2 = ethers.utils.formatBytes32String('board2_salt');

const tree1 = generateMerkleTree(BOARD_1, MASTER_SALT_BOARD_1);
const tree2 = generateMerkleTree(BOARD_2, MASTER_SALT_BOARD_2);

console.log('Board 1 Root:', tree1.getHexRoot());
console.log('Board 1 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_1));
console.log('Board 2 Root:', tree2.getHexRoot());
console.log('Board 2 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_2));

function generateProof(boardId, x, y) {
  const board = boardId === 1 ? BOARD_1 : BOARD_2;
  const masterSalt = boardId === 1 ? MASTER_SALT_BOARD_1 : MASTER_SALT_BOARD_2;
  const cellSalt = ethers.utils.solidityKeccak256(['bytes32', 'uint8', 'uint8'], [masterSalt, x, y]);
  const hit = board[x][y];
  const leaf = ethers.utils.solidityKeccak256(['uint8', 'bytes32'], [hit, cellSalt]);
  const tree = boardId === 1 ? tree1 : tree2;
  const proof = tree.getHexProof(leaf);
  return { hit, cellSalt, proof };
}

if (process.argv.length > 2) {
  const boardId = parseInt(process.argv[2], 10);
  const x = parseInt(process.argv[3], 10);
  const y = parseInt(process.argv[4], 10);

  if (isNaN(boardId) || isNaN(x) || isNaN(y) || x < 0 || x >= 10 || y < 0 || y >= 10) {
    console.error('Invalid input. Please ensure all inputs are numbers and coordinates are within range 0-9.');
    process.exit(1);
  }

  const proof = generateProof(boardId, x, y);
  console.log(`\nProof for Board ${boardId} (${x},${y}):`);
  console.log('Hit:', proof.hit);
  console.log('Cell Salt:', proof.cellSalt);
  console.log('Merkle Proof:', proof.proof);
} else {
  console.log('No coordinates provided. Usage: node script.js <boardId> <x> <y>');
}
