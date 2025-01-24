// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {OnChainBattleship} from "../src/OnChainBattleship.sol";

contract BattleshipTest is Test {
    OnChainBattleship game;
    address player1 = address(0x1);
    address player2 = address(0x2);

    // Precomputed values from the JavaScript script
    bytes32 board1Root = 0x8ccbddd7fd2ec18e21e3652640044519559788be4ef41b6697141f784e7c9f62; // Replace with your BOARD_1 root
    bytes32 board1HashedSalt = 0xdd93880a93079ff05c604ef191b2d3dbb7e8c8544b339abdd68d174e1efa46f6; // Replace with hashed salt of "board1_salt"
    bytes32 board2Root = 0x95df1b3d0e2aaf48044f145b5bddd78e6344185191b44c1a3247027e39c981c6 ; // Replace with your BOARD_2 root
    bytes32 board2HashedSalt = 0xa7189866a9b762ca46876a5fd819e7d269b0617e0e29e57bfca589ee07bc02f3 ; // Replace with hashed salt of "board2_salt"

    // Sample proof for Board 1 (x=0, y=0)
    bytes32 cellSaltBoard1_0_0 = 0xe8befb0edec8a4299e47e6d550414fa98dc7c2b1be4e42256f624d1da6aafa4d; // From JavaScript output
    bytes32[] proofBoard1_0_0 = [
       bytes32( 0x877f47faf1c932d8792648b044552081c862f5eb904b27f2faee5dad56d96cc3),
  bytes32(0xade88eae5d5c567c472a7f5fba448f8b86cf3cb78b61d912fad9c9308c11c5e8),
  bytes32(0x4a423d0bc654e88aca885c1a8ab1efc4f84004b9d7fff9e7bdb8722c9777ccb9),
  bytes32(0x1c001ec1342b01ae4d5b8b7d7b276c1b10b45abd8ee3ec8aa2b0845c83e60188),
  bytes32(0xd52651dfe2e9e14f124061b96f6f7641e98c6d3f1e39cef057a7c08673fed99b),
  bytes32(0x95841e401cc494670932c6b04c09aedb9d49e176b01baad4fc50e9e5beaec983),
  bytes32(0x9e3f34627523faa9d0b785cd72dd706777693f148fe990be0085930d96a155f5)

    ]; // From JavaScript output

    function setUp() public {
        game = new OnChainBattleship();
        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
    }

    // Test full game flow
    function testFullGameFlow() public {
        // Player 1 commits board
        vm.prank(player1);
        game.commitBoard{value: 1 ether}(board1Root, board1HashedSalt);

        // Player 2 commits board
        vm.prank(player2);
        game.commitBoard{value: 1 ether}(board2Root, board2HashedSalt);

        // Player 1 guesses (0,0) on Player 2's board
        vm.prank(player1);
        game.submitGuess(0, 0);

        // Player 2 responds (simulate a hit)
        vm.prank(player2);
        game.respondToGuess(
            true, // hit
            cellSaltBoard1_0_0,
            proofBoard1_0_0
        );

        //TODO: implement until 17 hits, may be for loop. 
        // Todo can we use fuzzing here to generate random guesses?

        // After 17 hits, reveal salts
        vm.prank(player1);
        game.revealMasterSalt(keccak256("board1_salt"));

        vm.prank(player2);
        game.revealMasterSalt(keccak256("board2_salt"));

        // Withdraw stakes
        vm.prank(player1);
        game.withdraw();
    }

    // Test invalid proof submission
    function testInvalidProof() public {
        vm.prank(player1);
        game.commitBoard{value: 1 ether}(board1Root, board1HashedSalt);

        vm.prank(player2);
        game.commitBoard{value: 1 ether}(board2Root, board2HashedSalt);

        vm.prank(player1);
        game.submitGuess(0, 0);

        // Wrong cell salt
        vm.prank(player2);
        vm.expectRevert("Invalid proof");
        game.respondToGuess(true, keccak256("wrong_salt"), proofBoard1_0_0);
    }
}