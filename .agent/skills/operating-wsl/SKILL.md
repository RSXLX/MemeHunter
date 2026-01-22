---
name: operating-wsl
description: Executing commands, managing files, and deploying Solana contracts within the Windows Subsystem for Linux (WSL). Use when the user asks to run linux commands, deploy solana contracts, or interact with the WSL environment.
---

# Operating WSL (Windows Subsystem for Linux)

## When to use this skill
- User asks to run Linux-specific commands (ls, grep, bash scripts).
- User wants to interact with Solana tools (solana, anchor, spl-token) which are installed in WSL.
- User needs to deploy contracts or run tests in the WSL environment.
- User references paths that need to be accessed via WSL (e.g., "in my linux home folder").

## Workflow

1.  **Identify Context**:
    -   Is the target file/directory on Windows (C:\...) or WSL (~/ or /home/...)?
    -   Does the command require specific environment variables (like Solana PATH)?

2.  **Path Translation**:
    -   If working on a Windows path: Convert `C:\Users\Name\Project` -> `/mnt/c/Users/Name/Project`.
    -   If working on a WSL path: Use the absolute WSL path directly.

3.  **Construct Command**:
    -   Use `wsl -d Ubuntu -- <command>` for simple commands.
    -   Use `wsl -d Ubuntu -- bash -ilc "<command>"` if you need to load the user's `.bashrc` or `.profile` (crucial for Solana/Rust/Node paths).

## Instructions

### 1. Running Commands
Always run commands using the `run_command` tool from the Windows side, wrapping the execution in `wsl`.

**Pattern:**
```powershell
wsl -d Ubuntu -- bash -ilc 'cd <TargetDirectory> && <Command>'
```

**Example (Build Solana Project):**
- **User CWD**: `C:\Users\94447\Desktop\memehunter`
- **WSL Path**: `/mnt/c/Users/94447/Desktop/memehunter`
- **Command**:
```powershell
wsl -d Ubuntu -- bash -ilc 'cd /mnt/c/Users/94447/Desktop/memehunter && anchor build'
```

### 2. Handling Solana/Anchor
Solana tools often live in `~/.local/share/solana/install/active_release/bin` or are added to PATH in `.bashrc`.
- **ALWAYS** use `bash -ilc` (interactive login shell) to ensure PATH is correctly loaded.
- Validating Solana installation: `wsl -d Ubuntu -- bash -ilc 'solana --version'`

### 3. Path Conversion Reference
- `C:\Users\94447\Desktop` -> `/mnt/c/Users/94447/Desktop`
- `\` (Windows separator) -> `/` (Linux separator)
- Wrap paths in quotes if they contain spaces.

## Common Tasks for Memehunter Project

### Status Check
To check if the Solana test validator is running or port usage:
```powershell
wsl -d Ubuntu -- bash -ilc 'lsof -i :8899'
```

### Deploying
```powershell
wsl -d Ubuntu -- bash -ilc 'cd /mnt/c/Users/94447/Desktop/memehunter && anchor deploy --provider.cluster devnet'
```

### Logs
To tail logs inside WSL:
```powershell
wsl -d Ubuntu -- bash -ilc 'tail -f .anchor/program-logs/*.log'
```
