// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MemeHunter.sol";

contract DeployMemeHunter is Script {
    function run() external {
        // 从环境变量读取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address relayer = vm.envAddress("RELAYER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署合约
        MemeHunter hunter = new MemeHunter(relayer);
        
        console.log("MemeHunter deployed to:", address(hunter));
        console.log("Owner:", hunter.owner());
        console.log("Relayer:", hunter.relayer());
        
        // 可选: 注入初始空投池资金
        uint256 initialPool = vm.envOr("INITIAL_POOL", uint256(0));
        if (initialPool > 0) {
            hunter.depositToPool{value: initialPool}();
            console.log("Initial pool deposited:", initialPool);
        }
        
        vm.stopBroadcast();
    }
}
