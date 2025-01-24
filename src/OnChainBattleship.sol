// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract OnChainBattleship {
    enum GamePhase { Setup, Started, Ended }

    struct Player {
        address addr;
        bytes32 boardRoot;
        bytes32 hashedMasterSalt;
        uint256 hits;
        bool revealed;
    }

    GamePhase public gamePhase;
    Player public player1;
    Player public player2;
    address public currentGuesser;
    uint256 public constant STAKE = 1 ether;

    // Pending guess tracking
    struct PendingGuess {
        address guesser;
        address target;
        uint8 x;
        uint8 y;
    }
    PendingGuess public pendingGuess;

    event GameStarted();
    event GuessSubmitted(address indexed guesser, uint8 x, uint8 y);
    event GuessResponded(address indexed responder, bool hit);
    event SaltRevealed(address indexed player);
    event GameEnded(address indexed winner);

    modifier onlyPlayers() {
        require(msg.sender == player1.addr || msg.sender == player2.addr, "Not a player");
        _;
    }

    // Commit board (called by both players)
    function commitBoard(bytes32 _boardRoot, bytes32 _hashedMasterSalt) external payable {
        require(gamePhase == GamePhase.Setup, "Game already started");
        require(msg.value == STAKE, "Incorrect stake");

        if (player1.addr == address(0)) {
            player1 = Player(msg.sender, _boardRoot, _hashedMasterSalt, 0, false);
        } else {
            require(player2.addr == address(0), "Both players committed");
            player2 = Player(msg.sender, _boardRoot, _hashedMasterSalt, 0, false);
            gamePhase = GamePhase.Started;
            currentGuesser = player1.addr;
            emit GameStarted();
        }
    }

    // Submit a guess (currentGuesser's turn)
    function submitGuess(uint8 _x, uint8 _y) external onlyPlayers {
        require(gamePhase == GamePhase.Started, "Game not active");
        require(msg.sender == currentGuesser, "Not your turn");
        require(pendingGuess.guesser == address(0), "Pending guess unresolved");

        pendingGuess = PendingGuess(
            msg.sender,
            (msg.sender == player1.addr) ? player2.addr : player1.addr,
            _x,
            _y
        );
        emit GuessSubmitted(msg.sender, _x, _y);
    }

    // Respond to a guess (target player provides proof)
    function respondToGuess(bool _hit, bytes32 _cellSalt, bytes32[] calldata _proof) external {
        require(gamePhase == GamePhase.Started, "Game not active");
        require(msg.sender == pendingGuess.target, "Not your board");

        Player storage targetPlayer = (msg.sender == player1.addr) ? player1 : player2;
        bytes32 leaf = keccak256(abi.encodePacked(_hit, _cellSalt));
        bool valid = MerkleProof.verify(_proof, targetPlayer.boardRoot, leaf);
        require(valid, "Invalid proof");

        if (_hit) {
            targetPlayer.hits++;
            if (targetPlayer.hits == 17) {
                gamePhase = GamePhase.Ended;
                emit GameEnded(pendingGuess.guesser);
            }
        }

        currentGuesser = pendingGuess.target; // Switch turns
        delete pendingGuess;
        emit GuessResponded(msg.sender, _hit);
    }

    // Reveal master salt post-game
    function revealMasterSalt(bytes32 _masterSalt) external onlyPlayers {
        require(gamePhase == GamePhase.Ended, "Game ongoing");
        Player storage player = (msg.sender == player1.addr) ? player1 : player2;
        require(keccak256(abi.encodePacked(_masterSalt)) == player.hashedMasterSalt, "Invalid salt");
        player.revealed = true;
        emit SaltRevealed(msg.sender);
    }

    // Withdraw stake after both salts are revealed
    function withdraw() external {
        require(gamePhase == GamePhase.Ended, "Game ongoing");
        require(player1.revealed && player2.revealed, "Salts not revealed");

        (bool success1, ) = player1.addr.call{value: STAKE}("");
        (bool success2, ) = player2.addr.call{value: STAKE}("");
        require(success1 && success2, "Withdrawal failed");
    }
}