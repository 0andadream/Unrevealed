// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {WOKB} from "../src/WOKB.sol";
import {MockToken} from "../src/MockToken.sol";
import {Faucet} from "../src/Faucet.sol";
import {Oracle} from "../src/Oracle.sol";
import {SwapPool} from "../src/SwapPool.sol";
import {LimitBook} from "../src/LimitBook.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        address deployer = vm.addr(pk);

        WOKB wokb = new WOKB();
        MockToken usdc = new MockToken("USD Coin", "USDC", 6);
        MockToken usdt = new MockToken("Tether USD", "USDT", 6);
        MockToken eth = new MockToken("Ether", "ETH", 18);
        MockToken wbtc = new MockToken("Wrapped BTC", "WBTC", 8);

        Faucet faucet = new Faucet(usdc, usdt, eth, wbtc);
        usdc.setMinter(address(faucet), true);
        usdt.setMinter(address(faucet), true);
        eth.setMinter(address(faucet), true);
        wbtc.setMinter(address(faucet), true);

        usdc.mint(deployer, 500_000e6);
        usdt.mint(deployer, 500_000e6);
        eth.mint(deployer, 100 ether);
        wbtc.mint(deployer, 10e8);

        Oracle oracle = new Oracle();
        oracle.setPrice(address(wokb), 50e8);
        oracle.setPrice(address(usdc), 1e8);
        oracle.setPrice(address(usdt), 1e8);
        oracle.setPrice(address(eth), 2_800e8);
        oracle.setPrice(address(wbtc), 65_000e8);

        SwapPool pool = new SwapPool(address(wokb));
        usdc.approve(address(pool), type(uint256).max);
        usdt.approve(address(pool), type(uint256).max);
        eth.approve(address(pool), type(uint256).max);
        wbtc.approve(address(pool), type(uint256).max);

        pool.addLiquidity{value: 200 ether}(address(wokb), address(usdc), 200 ether, 10_000e6);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(usdt), 200 ether, 10_000e6);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(eth), 200 ether, 3.571428571428571428 ether);
        pool.addLiquidity{value: 200 ether}(address(wokb), address(wbtc), 200 ether, 0.15384615e8);

        pool.addLiquidity(address(usdc), address(usdt), 20_000e6, 20_000e6);
        pool.addLiquidity(address(usdc), address(eth), 28_000e6, 10 ether);
        pool.addLiquidity(address(usdc), address(wbtc), 65_000e6, 1e8);
        pool.addLiquidity(address(usdt), address(eth), 28_000e6, 10 ether);
        pool.addLiquidity(address(usdt), address(wbtc), 65_000e6, 1e8);
        pool.addLiquidity(address(eth), address(wbtc), 23.214285714285714285 ether, 1e8);

        LimitBook book = new LimitBook(address(pool), address(oracle), address(wokb));

        vm.stopBroadcast();

        string memory json = string.concat(
            "{\n",
            '  "wokb": "',
            vm.toString(address(wokb)),
            '",\n',
            '  "usdc": "',
            vm.toString(address(usdc)),
            '",\n',
            '  "usdt": "',
            vm.toString(address(usdt)),
            '",\n',
            '  "eth": "',
            vm.toString(address(eth)),
            '",\n',
            '  "wbtc": "',
            vm.toString(address(wbtc)),
            '",\n',
            '  "swapPool": "',
            vm.toString(address(pool)),
            '",\n',
            '  "oracle": "',
            vm.toString(address(oracle)),
            '",\n',
            '  "limitBook": "',
            vm.toString(address(book)),
            '",\n',
            '  "faucet": "',
            vm.toString(address(faucet)),
            '"\n',
            "}\n"
        );
        vm.writeFile("deployments/local.json", json);

        console.log("WOKB", address(wokb));
        console.log("USDC", address(usdc));
        console.log("USDT", address(usdt));
        console.log("ETH", address(eth));
        console.log("WBTC", address(wbtc));
        console.log("SwapPool", address(pool));
        console.log("Oracle", address(oracle));
        console.log("LimitBook", address(book));
        console.log("Faucet", address(faucet));
    }
}
