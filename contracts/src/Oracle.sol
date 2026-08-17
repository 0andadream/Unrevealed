// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice USD prices with 8 decimals (Chainlink-style). Permissionless on this demo so a
/// judge can move a price and fill a limit order without a keeper key.
contract Oracle {
    mapping(address => uint256) public usdPrice; // 1e8

    event PriceSet(address indexed asset, uint256 priceUsd8);

    function setPrice(address asset, uint256 priceUsd8) external {
        require(priceUsd8 > 0, "price");
        usdPrice[asset] = priceUsd8;
        emit PriceSet(asset, priceUsd8);
    }

    function setPrices(address[] calldata assets, uint256[] calldata prices) external {
        require(assets.length == prices.length, "len");
        for (uint256 i; i < assets.length; i++) {
            require(prices[i] > 0, "price");
            usdPrice[assets[i]] = prices[i];
            emit PriceSet(assets[i], prices[i]);
        }
    }
}
