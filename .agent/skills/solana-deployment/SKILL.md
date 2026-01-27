---
name: solana-deployment
description: Guide for deploying Solana Anchor contracts, including environment setup, version compatibility fixes, and deployment steps.
---

# Solana Anchor Contract Deployment Guide

## 1. Environment Requirements (Tested Configuration)

This configuration is verified to work on macOS (Apple Silicon) as of Jan 2026.

*   **Rust**: Stable 1.93.0 (or newer stable)
    *   *Avoid nightly unless explicitly required, often causes conflicts.*
*   **Solana CLI**: v4.0.0 (edge/beta channel)
    *   *Required for compatibility with newer crates using `edition2024`.*
    *   *v1.18.x / v2.x often bundle outdated platform tools (Cargo 1.84) which fail to build newer dependencies.*
*   **Anchor CLI**: v0.31.0
*   **anchor-lang**: v0.31.1 (Match `Cargo.toml` dependencies)

## 2. Installation Steps

### 2.1 Install Rust (Stable)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default stable
rustup update stable
```

### 2.2 Install Solana CLI (Edge/Beta)
To get the latest platform tools (Cargo/Rustc) compatible with modern crates:
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/edge/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version  # Should be >= 4.0.0
```

### 2.3 Install Anchor CLI
Use `cargo install` for the specific version to ensure compatibility:
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.0 anchor-cli --locked
anchor --version
```

### 2.4 Helius RPC Setup (Recommended for Devnet)
Public Devnet endpoints often timeout. Use Helius RPC.
```bash
# Note: Ensure API key format is correct (moved to query param for older CLI compatibility or standard URL)
solana config set --url "https://devnet.helius-rpc.com/?api-key=<YOUR_API_KEY>"
```
Get test SOL:
```bash
solana airdrop 2
```
(If airdrop fails, use https://faucet.solana.com/)

## 3. Project Configuration

### 3.1 `Cargo.toml` (Program)
Ensure `anchor-lang` and `anchor-spl` match the installed CLI version (or are compatible).
Also, **crucially**, enable `idl-build` feature for Anchor >= 0.30.

```toml
[features]
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[dependencies]
anchor-lang = "0.31.1" # Use 0.31.1 to fix 'source_file' issue in syn
anchor-spl = "0.31.1"
```

### 3.2 `rust-toolchain.toml`
Set to stable to avoid forcing an old nightly version.
```toml
[toolchain]
channel = "stable"
```

### 3.3 `Anchor.toml`
Update the cluster to use your config or explicit URL.
```toml
[provider]
cluster = "devnet" 
wallet = "~/.config/solana/id.json"
```

## 4. Build & Deploy Steps

### 4.1 Build
```bash
# Clear legacy artifacts if needed
anchor build
```

**Troubleshooting Build Issues:**
*   **`edition2024` feature required**: This means the Solana platform tools (bundled with Solana CLI) are too old. **Upgrade Solana CLI to Edge/v4.0.0+**.
*   **Workspace issues**: If `anchor build` pick up folders it shouldn't, add `exclude` to root `Cargo.toml` or remove the offending folder.
*   **`proc_macro2::Span` method not found**: Upgrade `anchor-lang` to `0.31.1`.

### 4.2 Deploy
```bash
anchor deploy --provider.cluster devnet
```
Or using Solana CLI directly (uses Helius RPC from config):
```bash
solana program deploy ./target/deploy/meme_hunter.so
```

### 4.3 Verify
```bash
solana program show <PROGRAM_ID>
```
Update `Anchor.toml` and your frontend config with the new Program ID.
