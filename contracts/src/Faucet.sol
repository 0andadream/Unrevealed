// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MockToken} from "./MockToken.sol";

/// @notice Demo drip of mock USDC / USDT / ETH / WBTC. Native OKB comes from the chain faucet.
contract Faucet {
    MockToken public immutable usdc;
    MockToken public immutable usdt;
    MockToken public immutable eth;
    MockToken public immutable wbtc;

    uint256 public constant COOLDOWN = 1 hours;
    mapping(address => uint256) public lastDrip;

    error Cooldown();

    constructor(MockToken usdc_, MockToken usdt_, MockToken eth_, MockToken wbtc_) {
        usdc = usdc_;
        usdt = usdt_;
        eth = eth_;
        wbtc = wbtc_;
    }

    function drip() external {
        if (lastDrip[msg.sender] + COOLDOWN > block.timestamp && lastDrip[msg.sender] != 0) {
            revert Cooldown();
        }
        lastDrip[msg.sender] = block.timestamp;
        usdc.mint(msg.sender, 10_000 * 1e6);
        usdt.mint(msg.sender, 10_000 * 1e6);
        eth.mint(msg.sender, 5 ether);
        wbtc.mint(msg.sender, 1e7); // 0.1 WBTC
    }
}
