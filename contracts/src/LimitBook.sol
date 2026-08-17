// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Oracle} from "./Oracle.sol";
import {SwapPool} from "./SwapPool.sol";
import {WOKB} from "./WOKB.sol";

/// @notice Escrow + conditional fill against the demo AMM. Price comes from Oracle (1e8 USD).
contract LimitBook is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Condition {
        None,
        PriceAbove,
        PriceBelow
    }

    struct Order {
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        Condition condition;
        address asset;
        uint256 triggerUsd8;
        bool filled;
        bool cancelled;
    }

    SwapPool public immutable pool;
    Oracle public immutable oracle;
    WOKB public immutable wokb;

    Order[] internal _orders;
    mapping(address => uint256[]) internal _byOwner;

    event Placed(uint256 indexed id, address indexed owner);
    event Cancelled(uint256 indexed id);
    event Filled(uint256 indexed id, uint256 amountOut);

    error NotOwner();
    error Inactive();
    error ConditionUnmet();

    constructor(address pool_, address oracle_, address wokb_) {
        pool = SwapPool(payable(pool_));
        oracle = Oracle(oracle_);
        wokb = WOKB(payable(wokb_));
    }

    receive() external payable {}

    function nextId() external view returns (uint256) {
        return _orders.length;
    }

    function getOrder(uint256 id) external view returns (Order memory) {
        require(id > 0 && id <= _orders.length, "id");
        return _orders[id - 1];
    }

    function ordersOf(address owner) external view returns (uint256[] memory) {
        return _byOwner[owner];
    }

    function place(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        Condition condition,
        address asset,
        uint256 triggerUsd8
    ) external payable nonReentrant returns (uint256 id) {
        require(tokenIn != tokenOut, "same");
        require(amountIn > 0, "amount");
        require(condition == Condition.PriceAbove || condition == Condition.PriceBelow, "cond");
        require(asset != address(0) && triggerUsd8 > 0, "trigger");

        if (tokenIn == address(wokb) && msg.value > 0) {
            require(msg.value == amountIn, "value");
            wokb.deposit{value: amountIn}();
        } else {
            require(msg.value == 0, "unexpected value");
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        }

        _orders.push(
            Order({
                owner: msg.sender,
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                condition: condition,
                asset: asset,
                triggerUsd8: triggerUsd8,
                filled: false,
                cancelled: false
            })
        );
        id = _orders.length;
        _byOwner[msg.sender].push(id);
        emit Placed(id, msg.sender);
    }

    function cancel(uint256 id) external nonReentrant {
        Order storage o = _requireActive(id);
        if (o.owner != msg.sender) revert NotOwner();
        o.cancelled = true;
        _refund(o);
        emit Cancelled(id);
    }

    function execute(uint256 id, uint256 minOut) external nonReentrant returns (uint256 amountOut) {
        Order storage o = _requireActive(id);
        uint256 px = oracle.usdPrice(o.asset);
        if (o.condition == Condition.PriceAbove) {
            if (px < o.triggerUsd8) revert ConditionUnmet();
        } else if (px > o.triggerUsd8) {
            revert ConditionUnmet();
        }

        o.filled = true;
        IERC20(o.tokenIn).forceApprove(address(pool), o.amountIn);
        amountOut = pool.swap(o.tokenIn, o.tokenOut, o.amountIn, minOut, o.owner);
        emit Filled(id, amountOut);
    }

    function conditionMet(uint256 id) external view returns (bool) {
        if (id == 0 || id > _orders.length) return false;
        Order storage o = _orders[id - 1];
        if (o.filled || o.cancelled) return false;
        uint256 px = oracle.usdPrice(o.asset);
        if (o.condition == Condition.PriceAbove) return px >= o.triggerUsd8;
        if (o.condition == Condition.PriceBelow) return px <= o.triggerUsd8;
        return false;
    }

    function _requireActive(uint256 id) internal view returns (Order storage o) {
        require(id > 0 && id <= _orders.length, "id");
        o = _orders[id - 1];
        if (o.filled || o.cancelled) revert Inactive();
    }

    function _refund(Order storage o) internal {
        if (o.tokenIn == address(wokb)) {
            wokb.withdraw(o.amountIn);
            (bool ok,) = payable(o.owner).call{value: o.amountIn}("");
            require(ok, "refund");
        } else {
            IERC20(o.tokenIn).safeTransfer(o.owner, o.amountIn);
        }
    }
}
