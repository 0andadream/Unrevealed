// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {WOKB} from "../src/WOKB.sol";
import {MockToken} from "../src/MockToken.sol";
import {SwapPool} from "../src/SwapPool.sol";
import {Oracle} from "../src/Oracle.sol";
import {LimitBook} from "../src/LimitBook.sol";

contract LimitBookTest is Test {
    WOKB wokb;
    MockToken usdc;
    SwapPool pool;
    Oracle oracle;
    LimitBook book;
    address alice = address(0xA11CE);

    function setUp() public {
        wokb = new WOKB();
        usdc = new MockToken("USD Coin", "USDC", 6);
        pool = new SwapPool(address(wokb));
        oracle = new Oracle();
        book = new LimitBook(address(pool), address(oracle), address(wokb));

        usdc.mint(address(this), 1_000_000e6);
        usdc.approve(address(pool), type(uint256).max);
        vm.deal(address(this), 1_000 ether);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(usdc), 200 ether, 10_000e6);

        oracle.setPrice(address(wokb), 50e8);
        vm.deal(alice, 20 ether);
    }

    function testPlaceAndCancelRefundsNative() public {
        vm.prank(alice);
        uint256 id = book.place{value: 5 ether}(
            address(wokb), address(usdc), 5 ether, LimitBook.Condition.PriceAbove, address(wokb), 55e8
        );
        assertEq(id, 1);
        uint256 before = alice.balance;
        vm.prank(alice);
        book.cancel(id);
        assertEq(alice.balance, before + 5 ether);
    }

    function testExecuteBlockedUntilPrice() public {
        vm.prank(alice);
        uint256 id = book.place{value: 5 ether}(
            address(wokb), address(usdc), 5 ether, LimitBook.Condition.PriceAbove, address(wokb), 55e8
        );
        assertFalse(book.conditionMet(id));
        vm.expectRevert(LimitBook.ConditionUnmet.selector);
        book.execute(id, 1);

        oracle.setPrice(address(wokb), 55e8);
        assertTrue(book.conditionMet(id));
        uint256 usdcBefore = usdc.balanceOf(alice);
        book.execute(id, 1);
        assertGt(usdc.balanceOf(alice), usdcBefore);
        LimitBook.Order memory o = book.getOrder(id);
        assertTrue(o.filled);
    }

    function testPriceBelow() public {
        usdc.mint(alice, 1_000e6);
        vm.startPrank(alice);
        usdc.approve(address(book), 500e6);
        uint256 id = book.place(
            address(usdc), address(wokb), 500e6, LimitBook.Condition.PriceBelow, address(0xE7), 2_800e8
        );
        vm.stopPrank();

        oracle.setPrice(address(0xE7), 3_000e8);
        vm.expectRevert(LimitBook.ConditionUnmet.selector);
        book.execute(id, 1);

        oracle.setPrice(address(0xE7), 2_799e8);
        book.execute(id, 1);
        assertTrue(book.getOrder(id).filled);
    }
}
