// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockToken is ERC20, Ownable {
    uint8 private immutable _decimals;
    mapping(address => bool) public minters;

    error NotMinter();

    constructor(string memory name_, string memory symbol_, uint8 decimals_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        _decimals = decimals_;
        minters[msg.sender] = true;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
    }

    function mint(address to, uint256 amount) external {
        if (!minters[msg.sender]) revert NotMinter();
        _mint(to, amount);
    }
}
