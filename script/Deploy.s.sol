// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {OnChainBattleship} from "../src/OnChainBattleship.sol";

contract DeployBattleship is Script {
    function run() external returns (OnChainBattleship) {
        vm.startBroadcast();
        OnChainBattleship game = new OnChainBattleship();
        vm.stopBroadcast();
        return game;
    }
}