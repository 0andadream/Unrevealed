// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {WOKB} from "../src/WOKB.sol";
import {MockToken} from "../src/MockToken.sol";
import {SwapPool} from "../src/SwapPool.sol";

contract SwapPoolTest is Test {
    WOKB wokb;
    MockToken usdc;
    SwapPool pool;
    address alice = address(0xA11CE);

    function setUp() public {
        wokb = new WOKB();
        usdc = new MockToken("USD Coin", "USDC", 6);
        pool = new SwapPool(address(wokb));
        usdc.mint(address(this), 1_000_000e6);
        usdc.mint(alice, 10_000e6);
        vm.deal(address(this), 1_000 ether);
        vm.deal(alice, 50 ether);
    }

    function testSwapNativeOkbForUsdc() public {
        usdc.approve(address(pool), 10_000e6);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(usdc), 200 ether, 10_000e6);

        uint256 quoted = pool.quote(address(wokb), address(usdc), 5 ether);
        assertGt(quoted, 0);

        vm.prank(alice);
        uint256 out = pool.swap{value: 5 ether}(address(wokb), address(usdc), 5 ether, 1, alice);
        assertEq(out, quoted);
        assertEq(usdc.balanceOf(alice), 10_000e6 + out);
    }

    function testSwapUsdcForNative() public {
        usdc.approve(address(pool), 10_000e6);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(usdc), 200 ether, 10_000e6);

        uint256 before = alice.balance;
        vm.startPrank(alice);
        usdc.approve(address(pool), 100e6);
        uint256 out = pool.swap(address(usdc), address(wokb), 100e6, 1, alice);
        vm.stopPrank();
        assertEq(alice.balance, before + out);
    }
}
