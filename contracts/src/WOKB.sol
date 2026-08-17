// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice WETH9-style wrapper for native OKB (or Anvil ETH treated as OKB).
contract WOKB is ERC20 {
    constructor() ERC20("Wrapped OKB", "WOKB") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) public {
        _burn(msg.sender, amount);
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "WOKB: transfer");
    }

    receive() external payable {
        deposit();
    }
}
