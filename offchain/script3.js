const { MerkleTree } = require('merkletreejs');
const { ethers } = require('ethers');
const readline = require('readline');

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
  
  // Generate Merkle Tree for a Board
  function generateMerkleTree(board, masterSalt) {
    const leaves = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        // Compute cell_salt = keccak256(masterSalt + x + y)
        const cellSalt = ethers.utils.solidityKeccak256(
          ['bytes32', 'uint8', 'uint8'],
          [masterSalt, x, y]
        );
        
        // Compute leaf = keccak256(hit || cellSalt)
        const hit = board[x][y];
        const leaf = ethers.utils.solidityKeccak256(
          ['uint8', 'bytes32'],
          [hit, cellSalt]
        );
        leaves.push(leaf);
      }
    }
    return new MerkleTree(leaves, ethers.utils.keccak256, { sort: true });
  }
  
  // Precomputed Data for Testing
  const MASTER_SALT_BOARD_1 = ethers.utils.formatBytes32String('board1_salt');
  const MASTER_SALT_BOARD_2 = ethers.utils.formatBytes32String('board2_salt');
  
  const tree1 = generateMerkleTree(BOARD_1, MASTER_SALT_BOARD_1);
  const tree2 = generateMerkleTree(BOARD_2, MASTER_SALT_BOARD_2);
  
  console.log('Board 1 Root:', tree1.getHexRoot());
  console.log('Board 1 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_1));
  console.log('Board 2 Root:', tree2.getHexRoot());
  console.log('Board 2 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_2));

  // Generate Proof for a Specific (x,y) in a Board
function generateProof(boardId, x, y) {
    if (x < 0 || x >= 10 || y < 0 || y >= 10) throw new Error('Invalid coordinates');
    
    const board = boardId === 1 ? BOARD_1 : BOARD_2;
    const masterSalt = boardId === 1 ? MASTER_SALT_BOARD_1 : MASTER_SALT_BOARD_2;
    
    // Compute cell_salt and leaf
    const cellSalt = ethers.utils.solidityKeccak256(
      ['bytes32', 'uint8', 'uint8'],
      [masterSalt, x, y]
    );
    const hit = board[x][y];
    const leaf = ethers.utils.solidityKeccak256(
      ['uint8', 'bytes32'],
      [hit, cellSalt]
    );
    
    // Generate Merkle proof
    const tree = boardId === 1 ? tree1 : tree2;
    const proof = tree.getHexProof(leaf);
    
    return {
      hit,
      cellSalt,
      proof
    };
  }

// Add this function to your existing script
function generateShipBitmask(board) {
    let bitmask = BigInt(0);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const bitPosition = BigInt(x * 10 + y);
        if (board[x][y] === 1) {
          bitmask |= (BigInt(1) << bitPosition);
        }
      }
    }
    return '0x' + bitmask.toString(16).padStart(32, '0'); // Return as hex string
  }
  
  // Example usage:
  const shipBitmaskBoard1 = generateShipBitmask(BOARD_1);
  const shipBitmaskBoard2 = generateShipBitmask(BOARD_2);
  
  console.log('\nShip Bitmasks:');
  console.log('Board 1 Bitmask:', shipBitmaskBoard1);
  console.log('Board 2 Bitmask:', shipBitmaskBoard2);



  
// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask for coordinates recursively
function askForProof() {
  rl.question('Enter boardId (1 or 2), x, y (comma-separated) or "exit" to quit: ', (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      const [boardId, x, y] = input.split(',').map(Number);
      const proof = generateProof(boardId, x, y);
      console.log(`\nProof for Board ${boardId} (${x},${y}):`);
      console.log('Hit:', proof.hit);
      console.log('cellSalt:', proof.cellSalt);
      console.log('Merkle Proof:', proof.proof);
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Ask for next input
    askForProof();
  });
}

// Start by displaying the board roots and hashed master salts
console.log('Board 1 Root:', tree1.getHexRoot());
console.log('Board 1 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_1));
console.log('Board 2 Root:', tree2.getHexRoot());
console.log('Board 2 Hashed Master Salt:', ethers.utils.keccak256(MASTER_SALT_BOARD_2));

// Start the CLI loop
console.log('\nEnter coordinates to generate proofs. Type "exit" to quit.');
askForProof();
