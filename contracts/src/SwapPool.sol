// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {WOKB} from "./WOKB.sol";

/// @notice Constant-product AMM. Native OKB is wrapped to WOKB internally.
contract SwapPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    WOKB public immutable wokb;
    uint256 public constant FEE_BPS = 30; // 0.30%

    /// reserve[token][other] = amount of `token` sitting in the (token, other) pool
    mapping(address => mapping(address => uint256)) public reserve;

    event LiquidityAdded(
        address indexed provider, address tokenA, address tokenB, uint256 amountA, uint256 amountB
    );
    event Swapped(
        address indexed sender,
        address indexed recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address wokb_) {
        wokb = WOKB(payable(wokb_));
    }

    receive() external payable {}

    function quote(address tokenIn, address tokenOut, uint256 amountIn)
        public
        view
        returns (uint256 amountOut)
    {
        uint256 rin = reserve[tokenIn][tokenOut];
        uint256 rout = reserve[tokenOut][tokenIn];
        require(rin > 0 && rout > 0, "no pool");
        uint256 inWithFee = amountIn * (10_000 - FEE_BPS);
        amountOut = (inWithFee * rout) / (rin * 10_000 + inWithFee);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB)
        external
        payable
        nonReentrant
    {
        require(tokenA != tokenB, "same");
        bool usedNative;
        usedNative = _collect(tokenA, amountA, usedNative);
        usedNative = _collect(tokenB, amountB, usedNative);
        if (msg.value > 0) require(usedNative, "unexpected value");
        reserve[tokenA][tokenB] += amountA;
        reserve[tokenB][tokenA] += amountB;
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB);
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address recipient)
        external
        payable
        nonReentrant
        returns (uint256 amountOut)
    {
        require(tokenIn != tokenOut, "same");
        require(recipient != address(0), "recipient");
        bool usedNative = _collect(tokenIn, amountIn, false);
        if (msg.value > 0) require(usedNative, "unexpected value");
        amountOut = quote(tokenIn, tokenOut, amountIn);
        require(amountOut >= minOut, "slippage");
        reserve[tokenIn][tokenOut] += amountIn;
        reserve[tokenOut][tokenIn] -= amountOut;
        _push(tokenOut, recipient, amountOut);
        emit Swapped(msg.sender, recipient, tokenIn, tokenOut, amountIn, amountOut);
    }

    function _collect(address token, uint256 amount, bool usedNative) internal returns (bool) {
        if (token == address(wokb) && msg.value > 0 && !usedNative) {
            require(msg.value == amount, "value");
            wokb.deposit{value: amount}();
            return true;
        }
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        return usedNative;
    }

    function _push(address token, address to, uint256 amount) internal {
        if (token == address(wokb)) {
            wokb.withdraw(amount);
            (bool ok,) = payable(to).call{value: amount}("");
            require(ok, "native");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
