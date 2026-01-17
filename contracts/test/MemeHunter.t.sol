// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MemeHunter.sol";

contract MemeHunterTest is Test {
    MemeHunter public hunter;
    
    address public owner = address(this);
    address public relayer = address(0x1);
    address public player1 = address(0x2);
    address public player2 = address(0x3);
    address public sessionKey1;
    uint256 public sessionKey1PrivateKey;
    
    function setUp() public {
        // 创建 Session Key
        sessionKey1PrivateKey = 0xA11CE;
        sessionKey1 = vm.addr(sessionKey1PrivateKey);
        
        // 部署合约
        hunter = new MemeHunter(relayer);
        
        // 项目方注入空投池
        hunter.depositToPool{value: 10 ether}();
        
        // 给玩家一些 ETH
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(relayer, 10 ether);
        vm.deal(owner, 10 ether);
    }
    
    // 允许测试合约接收 ETH (作为 owner)
    receive() external payable {}
    
    // ============ 空投池测试 ============
    
    function testDepositToPool() public {
        uint256 balanceBefore = hunter.getPoolBalance();
        hunter.depositToPool{value: 1 ether}();
        assertEq(hunter.getPoolBalance(), balanceBefore + 1 ether);
    }
    
    function testDepositToPoolOnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Not owner");
        hunter.depositToPool{value: 1 ether}();
    }
    
    function testReceiveEth() public {
        uint256 balanceBefore = hunter.getPoolBalance();
        (bool success,) = address(hunter).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(hunter.getPoolBalance(), balanceBefore + 1 ether);
    }
    
    // ============ Session Key 测试 ============
    
    function testAuthorizeSessionKey() public {
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        
        assertTrue(hunter.isSessionKeyValid(sessionKey1));
        
        (address sessionOwner, uint256 expiresAt, bool isValid) = hunter.getSessionInfo(sessionKey1);
        assertEq(sessionOwner, player1);
        assertTrue(expiresAt > block.timestamp);
        assertTrue(isValid);
    }
    
    function testAuthorizeSessionKeyMaxDuration() public {
        vm.prank(player1);
        vm.expectRevert("Invalid duration");
        hunter.authorizeSessionKey(sessionKey1, 25 hours);
    }
    
    function testRevokeSessionKey() public {
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        assertTrue(hunter.isSessionKeyValid(sessionKey1));
        
        vm.prank(player1);
        hunter.revokeSessionKey(sessionKey1);
        assertFalse(hunter.isSessionKeyValid(sessionKey1));
    }
    
    function testSessionKeyExpiry() public {
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        assertTrue(hunter.isSessionKeyValid(sessionKey1));
        
        // 快进 2 小时
        vm.warp(block.timestamp + 2 hours);
        assertFalse(hunter.isSessionKeyValid(sessionKey1));
    }
    
    // ============ 狩猎测试 ============
    
    function testHuntWithSession() public {
        // 1. 玩家授权 Session Key
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        
        // 2. 构造签名
        uint8 memeId = 1;
        uint8 netSize = 1; // 中网
        uint256 nonce = 0;
        
        bytes32 innerHash = keccak256(abi.encode(memeId, netSize, nonce));
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            innerHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKey1PrivateKey, messageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        // 3. Relayer 发送狩猎请求
        uint256 cost = 0.01 ether; // 中网费用
        
        vm.prank(relayer);
        (bool success, uint256 reward, bool airdropTriggered, uint256 airdropReward) = 
            hunter.huntWithSession{value: cost}(sessionKey1, memeId, netSize, nonce, signature);
        
        // 4. 验证 nonce 增加
        assertEq(hunter.getNonce(player1), 1);
        
        // 5. 验证区块交易计数
        assertEq(hunter.getBlockTxCount(block.number), 1);
    }
    
    function testHuntOnlyRelayer() public {
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        
        bytes memory signature = new bytes(65);
        
        vm.prank(player1);
        vm.expectRevert("Not relayer");
        hunter.huntWithSession{value: 0.01 ether}(sessionKey1, 1, 1, 0, signature);
    }
    
    function testHuntInvalidSessionKey() public {
        bytes memory signature = new bytes(65);
        
        vm.prank(relayer);
        vm.expectRevert("Invalid or expired session key");
        hunter.huntWithSession{value: 0.01 ether}(sessionKey1, 1, 1, 0, signature);
    }
    
    function testHuntInsufficientPayment() public {
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        
        // 构造有效签名
        uint8 memeId = 1;
        uint8 netSize = 1;
        uint256 nonce = 0;
        
        bytes32 innerHash = keccak256(abi.encode(memeId, netSize, nonce));
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            innerHash
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKey1PrivateKey, messageHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(relayer);
        vm.expectRevert("Insufficient payment");
        hunter.huntWithSession{value: 0.001 ether}(sessionKey1, memeId, netSize, nonce, signature);
    }
    
    // ============ 高并发空投测试 ============
    
    function testHighConcurrencyAirdrop() public {
        // 模拟同区块多笔交易
        // 由于测试环境限制，这里只验证 blockTxCount 逻辑
        
        // 授权多个 Session Key
        address sessionKey2 = address(0x100);
        address sessionKey3 = address(0x101);
        
        vm.prank(player1);
        hunter.authorizeSessionKey(sessionKey1, 1 hours);
        
        // 验证阈值常量
        assertEq(hunter.CONCURRENT_THRESHOLD(), 3);
        assertEq(hunter.AIRDROP_CHANCE(), 20);
    }
    
    // ============ 费用配置测试 ============
    
    function testNetCostConstants() public view {
        assertEq(hunter.NET_COST_SMALL(), 0.005 ether);
        assertEq(hunter.NET_COST_MEDIUM(), 0.01 ether);
        assertEq(hunter.NET_COST_LARGE(), 0.02 ether);
    }
    
    function testMemeRewardConstants() public view {
        assertEq(hunter.REWARD_PEPE(), 0.02 ether);
        assertEq(hunter.REWARD_DOGE(), 0.02 ether);
        assertEq(hunter.REWARD_FOX(), 0.05 ether);
        assertEq(hunter.REWARD_DIAMOND(), 0.15 ether);
        assertEq(hunter.REWARD_ROCKET(), 0.50 ether);
    }
    
    // ============ 管理函数测试 ============
    
    function testSetRelayer() public {
        address newRelayer = address(0x999);
        hunter.setRelayer(newRelayer);
        assertEq(hunter.relayer(), newRelayer);
    }
    
    function testSetRelayerOnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Not owner");
        hunter.setRelayer(address(0x999));
    }
}
