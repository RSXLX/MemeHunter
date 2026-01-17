# MemeHunter 项目介绍

## 1. 项目概述

**MemeHunter** 是一款基于 **Monad** 高性能区块链构建的全链上（Fully On-Chain）互动游戏。玩家在一个公共的数字猎场中，通过点击屏幕发射捕网来捕捉四处逃窜的 Meme 精灵（如 Pepe, Doge, Fox 等）。

项目的核心愿景是展示 Monad 区块链在 **高并发**、**低延迟** 和 **低成本** 方面的卓越性能，为用户提供媲美 Web2 游戏的流畅体验。

### 核心玩法
1.  **连接钱包**：用户连接 MetaMask 等钱包并登录。
2.  **自动授权**：通过 Session Key 技术，用户只需授权一次，后续游戏过程无需频繁签名确认。
3.  **即时狩猎**：点击屏幕任意位置发射捕网，消耗少量 MON 代币。
4.  **实时反馈**：捕获成功直接获得 ETH/MON 奖励，失败则扣除网费。
5.  **并发奖励**：当网络拥堵或多人同时狩猎时，触发额外的空投奖励机制。

---

## 2. 合约逻辑与 Monad 优越性分析

MemeHunter 的智能合约设计深度结合了 Monad 的底层特性，将技术优势转化为游戏机制，具体体现在以下几个方面：

### 2.1 高并发激励机制 (TPS Advantage)

Monad 支持高达 10,000 TPS 的吞吐量。为了展示并利用这一特性，合约中设计了独有的 **并发空投机制**。

*   **合约逻辑**：
    合约维护了一个 `blockTxCount` 映射，记录每个区块内的交易数量。
    ```solidity
    // 记录区块交易数
    blockTxCount[block.number]++;
    
    // 高并发空投检测
    if (blockTxCount[block.number] >= CONCURRENT_THRESHOLD) {
        // ...触发空投逻辑
    }
    ```
*   **Monad 优势体现**：
    在传统区块链（如 Ethereum）上，高并发通常会导致网络拥堵和 Gas 飙升，用户体验极差。而在 MemeHunter 中，**我们反其道而行之，鼓励高并发**。当同一区块内的狩猎请求达到一定阈值（`CONCURRENT_THRESHOLD`），合约会自动触发“狂热模式”，给予玩家额外的空投奖励。这不仅展示了 Monad 轻松处理高并发的能力，还将其转化为了一种社交游戏乐趣——"人越多，奖励越多"。

### 2.2 极速确认与无感交互 (1s Block Time & Finality)

Monad 拥有 1 秒的区块时间和极快的确定性（Finality）。

*   **合约逻辑**：
    配合 **Session Key** 和 **Relayer** 架构，合约允许用户预先授权一个临时密钥。
    ```solidity
    function huntWithSession(...) external onlyRelayer {
        // 验证 Session Key
        require(isSessionKeyValid(sessionKey), "Invalid session");
        // ...执行狩猎
    }
    ```
*   **Monad 优势体现**：
    虽然 Session Key 在其他链上也能实现，但在 10-12 秒出块的链上，用户点击后仍需漫长等待才能确认结果（捕获与否）。
    在 Monad 上，**1 秒的出块时间** 使得从“点击”到“链上确认结果”几乎是瞬时的。这种毫秒级的反馈循环（Feedback Loop）对于动作类游戏至关重要，让去中心化游戏（GameFi）彻底摆脱了“卡顿”和“等待”的刻板印象。

### 2.3 微支付与高频交互 (Cheap Gas)

*   **合约逻辑**：
    每次狩猎都是一笔链上交易，涉及状态改变（余额扣除、随机数生成、奖励发放）。
    ```solidity
    uint256 public constant NET_COST_SMALL = 0.005 ether; // 极低的单次操作成本
    ```
*   **Monad 优势体现**：
    MemeHunter 的核心循环是高频点击（High-Frequency Interaction）。如果 Gas 费用高昂，这种“点击即交易”的模式在经济上是不可行的。Monad 的极低 Gas 费使得 **微支付（Micro-transactions）** 成为可能。用户可以连续发射数十次捕网，而无需担心手续费超过游戏收益。这为高频交互类 DApp 打开了全新的设计空间。

### 2.4 计算密集型逻辑 (EVM Compatibility & Performance)

*   **合约逻辑**：
    合约内部执行了多次哈希运算来生成伪随机数，并进行复杂的签名恢复（`ecrecover`）和状态更新。
    ```solidity
     uint256 rand = uint256(keccak256(abi.encodePacked(...))) % 100;
     address signer = _recoverSigner(messageHash, signature);
    ```
*   **Monad 优势体现**：
    Monad 优化的执行层极其高效。即便合约逻辑包含大量的计算和状态读写，也能保持极低的执行成本和延迟。这允许开发者在链上编写更复杂的业务逻辑（如复杂的掉落算法、动态概率调整），而无需为了节省 Gas 而牺牲游戏性。

## 3. 总结

MemeHunter 不仅仅是一个游戏，它是 Monad 性能的 **交互式演示**。

*   **高并发** → 变成了 **多人狂欢机制**
*   **低延迟** → 带来了 **实时动作体验**
*   **低 Gas** → 支撑了 **高频连续操作**

通过智能合约代码直接利用区块属性（`block.number`, `blockTxCount`），我们将 Monad 的技术参数具象化为玩家可感知的游戏乐趣。
