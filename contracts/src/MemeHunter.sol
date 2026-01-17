// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MemeHunter
 * @notice Meme 捕猎游戏合约 - 展示 Monad 高并发特性
 * @dev 玩家通过 Session Key 发送狩猎请求，抓到 Meme 直接获得空投
 */
contract MemeHunter {
    // ============ 状态变量 ============
    
    address public owner;
    address public relayer;
    
    // Session Key 信息
    struct SessionInfo {
        address owner;      // Session Key 的所有者
        uint256 expiresAt;  // 过期时间
    }
    mapping(address => SessionInfo) public sessions;
    
    // Nonce 防重放
    mapping(address => uint256) public nonces;
    
    // 区块交易计数 (用于高并发检测)
    mapping(uint256 => uint256) public blockTxCount;
    
    // ============ 常量配置 ============
    
    // 高并发阈值: 同区块 >= 3 笔交易触发空投机会
    uint256 public constant CONCURRENT_THRESHOLD = 3;
    
    // 空投触发概率: 20%
    uint256 public constant AIRDROP_CHANCE = 20;
    
    // 空投奖励范围: 5%-20% 的池子
    uint256 public constant MIN_AIRDROP_PERCENT = 5;
    uint256 public constant MAX_AIRDROP_PERCENT = 20;
    
    // 项目方抽成: 10%
    uint256 public constant OWNER_FEE_PERCENT = 10;
    
    // Session Key 最长有效期: 24小时
    uint256 public constant MAX_SESSION_DURATION = 24 hours;
    
    // 网大小费用 (wei)
    uint256 public constant NET_COST_SMALL = 0.005 ether;   // 小网
    uint256 public constant NET_COST_MEDIUM = 0.01 ether;   // 中网
    uint256 public constant NET_COST_LARGE = 0.02 ether;    // 大网
    
    // Meme 奖励 (wei)
    uint256 public constant REWARD_PEPE = 0.02 ether;       // ID=1 Pepe
    uint256 public constant REWARD_DOGE = 0.02 ether;       // ID=2 Doge
    uint256 public constant REWARD_FOX = 0.05 ether;        // ID=3 Fox
    uint256 public constant REWARD_DIAMOND = 0.15 ether;    // ID=4 Diamond
    uint256 public constant REWARD_ROCKET = 0.50 ether;     // ID=5 Rocket
    
    // ============ 事件 ============
    
    event PoolDeposited(address indexed depositor, uint256 amount);
    event SessionKeyAuthorized(address indexed owner, address indexed sessionKey, uint256 expiresAt);
    event SessionKeyRevoked(address indexed owner, address indexed sessionKey);
    event HuntResult(
        address indexed player,
        uint8 memeId,
        uint8 netSize,
        bool success,
        uint256 reward,
        uint256 cost
    );
    event AirdropTriggered(address indexed player, uint256 reward, uint256 blockTxCount);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    
    // ============ 修饰器 ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Not relayer");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor(address _relayer) {
        require(_relayer != address(0), "Invalid relayer");
        owner = msg.sender;
        relayer = _relayer;
    }
    
    // ============ 空投池管理 ============
    
    /**
     * @notice 项目方向空投池注入资金
     */
    function depositToPool() external payable onlyOwner {
        require(msg.value > 0, "Zero deposit");
        emit PoolDeposited(msg.sender, msg.value);
    }
    
    /**
     * @notice 查询空投池余额
     */
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ============ Session Key 管理 ============
    
    /**
     * @notice 用户授权 Session Key
     * @param sessionKey 临时密钥地址
     * @param duration 有效时长 (秒)
     */
    function authorizeSessionKey(address sessionKey, uint256 duration) external {
        require(sessionKey != address(0), "Invalid session key");
        require(duration > 0 && duration <= MAX_SESSION_DURATION, "Invalid duration");
        
        uint256 expiresAt = block.timestamp + duration;
        sessions[sessionKey] = SessionInfo({
            owner: msg.sender,
            expiresAt: expiresAt
        });
        
        emit SessionKeyAuthorized(msg.sender, sessionKey, expiresAt);
    }
    
    /**
     * @notice 用户撤销 Session Key
     * @param sessionKey 要撤销的密钥地址
     */
    function revokeSessionKey(address sessionKey) external {
        require(sessions[sessionKey].owner == msg.sender, "Not session owner");
        delete sessions[sessionKey];
        emit SessionKeyRevoked(msg.sender, sessionKey);
    }
    
    /**
     * @notice 检查 Session Key 是否有效
     */
    function isSessionKeyValid(address sessionKey) public view returns (bool) {
        SessionInfo memory info = sessions[sessionKey];
        return info.owner != address(0) && block.timestamp < info.expiresAt;
    }
    
    /**
     * @notice 获取 Session Key 信息
     */
    function getSessionInfo(address sessionKey) external view returns (address sessionOwner, uint256 expiresAt, bool isValid) {
        SessionInfo memory info = sessions[sessionKey];
        return (info.owner, info.expiresAt, isSessionKeyValid(sessionKey));
    }
    
    // ============ 核心狩猎逻辑 ============
    
    /**
     * @notice 通过 Session Key 执行狩猎 (仅 Relayer 可调用)
     * @param sessionKey Session Key 地址
     * @param memeId Meme ID (1-5)
     * @param netSize 网大小 (0=小, 1=中, 2=大)
     * @param nonce 用户 nonce
     * @param signature EIP-712 签名
     */
    function huntWithSession(
        address sessionKey,
        uint8 memeId,
        uint8 netSize,
        uint256 nonce,
        bytes calldata signature
    ) external payable onlyRelayer returns (bool success, uint256 reward, bool airdropTriggered, uint256 airdropReward) {
        // 1. 验证 Session Key
        require(isSessionKeyValid(sessionKey), "Invalid or expired session key");
        address player = sessions[sessionKey].owner;
        
        // 2. 验证 Nonce
        require(nonces[player] == nonce, "Invalid nonce");
        nonces[player]++;
        
        // 3. 验证签名
        bytes32 messageHash = _getMessageHash(memeId, netSize, nonce);
        address signer = _recoverSigner(messageHash, signature);
        require(signer == sessionKey, "Invalid signature");
        
        // 4. 验证付费
        uint256 cost = _getNetCost(netSize);
        require(msg.value >= cost, "Insufficient payment");
        
        // 5. 费用分配: 90% 入池, 10% 给项目方
        uint256 toOwner = cost * OWNER_FEE_PERCENT / 100;
        // 剩余留在合约 (空投池)
        if (toOwner > 0) {
            payable(owner).transfer(toOwner);
        }
        
        // 6. 记录区块交易数
        blockTxCount[block.number]++;
        
        // 7. 伪随机判定狩猎结果
        success = _rollHuntSuccess(player, nonce, netSize, memeId);
        
        // 8. 成功则发放奖励
        if (success) {
            reward = _getMemeReward(memeId);
            require(address(this).balance >= reward, "Pool insufficient");
            payable(player).transfer(reward);
        }
        
        emit HuntResult(player, memeId, netSize, success, reward, cost);
        
        // 9. 高并发空投检测
        if (blockTxCount[block.number] >= CONCURRENT_THRESHOLD) {
            if (_shouldTriggerAirdrop(player, nonce)) {
                airdropReward = _calculateAirdropReward();
                if (address(this).balance >= airdropReward && airdropReward > 0) {
                    airdropTriggered = true;
                    payable(player).transfer(airdropReward);
                    emit AirdropTriggered(player, airdropReward, blockTxCount[block.number]);
                }
            }
        }
        
        // 10. 退还多余的付款
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
        
        return (success, reward, airdropTriggered, airdropReward);
    }
    
    // ============ 内部函数 ============
    
    function _getNetCost(uint8 netSize) internal pure returns (uint256) {
        if (netSize == 0) return NET_COST_SMALL;
        if (netSize == 1) return NET_COST_MEDIUM;
        if (netSize == 2) return NET_COST_LARGE;
        revert("Invalid net size");
    }
    
    function _getMemeReward(uint8 memeId) internal pure returns (uint256) {
        if (memeId == 1) return REWARD_PEPE;
        if (memeId == 2) return REWARD_DOGE;
        if (memeId == 3) return REWARD_FOX;
        if (memeId == 4) return REWARD_DIAMOND;
        if (memeId == 5) return REWARD_ROCKET;
        revert("Invalid meme ID");
    }
    
    function _getBaseSuccessRate(uint8 netSize) internal pure returns (uint8) {
        // 小网 60%, 中网 50%, 大网 40%
        if (netSize == 0) return 60;
        if (netSize == 1) return 50;
        return 40;
    }
    
    function _getRarityPenalty(uint8 memeId) internal pure returns (uint8) {
        // Meme ID 越大越稀有，成功率惩罚越高
        // ID 1-5 → penalty 5-25
        return memeId * 5;
    }
    
    function _rollHuntSuccess(address player, uint256 nonce, uint8 netSize, uint8 memeId) internal view returns (bool) {
        uint8 baseRate = _getBaseSuccessRate(netSize);
        uint8 penalty = _getRarityPenalty(memeId);
        uint8 finalRate = baseRate > penalty ? baseRate - penalty : 10; // 最低 10% 成功率
        
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            nonce,
            "hunt"
        ))) % 100;
        
        return rand < finalRate;
    }
    
    function _shouldTriggerAirdrop(address player, uint256 nonce) internal view returns (bool) {
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            nonce,
            "airdrop"
        ))) % 100;
        
        return rand < AIRDROP_CHANCE;
    }
    
    function _calculateAirdropReward() internal view returns (uint256) {
        uint256 poolBalance = address(this).balance;
        if (poolBalance == 0) return 0;
        
        // 随机 5%-20% 的池子
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            "airdrop_amount"
        ))) % 16; // 0-15
        
        uint256 percent = MIN_AIRDROP_PERCENT + rand; // 5-20
        return poolBalance * percent / 100;
    }
    
    function _getMessageHash(uint8 memeId, uint8 netSize, uint256 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encode(memeId, netSize, nonce))
        ));
    }
    
    function _recoverSigner(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v");
        
        return ecrecover(hash, v, r, s);
    }
    
    // ============ 管理函数 ============
    
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer");
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }
    
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
    
    function getBlockTxCount(uint256 blockNumber) external view returns (uint256) {
        return blockTxCount[blockNumber];
    }
    
    // 允许合约接收 ETH
    receive() external payable {
        emit PoolDeposited(msg.sender, msg.value);
    }
}
