// 向空投池充值脚本
import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CONTRACT_ADDRESS = '0x63809b8CD0bD3336491B2BA2b1e7E1a1A630e86a';
const PRIVATE_KEY = '0x3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc';

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL),
});

async function main() {
  console.log('Depositing 2 MON to airdrop pool...');
  console.log('Contract:', CONTRACT_ADDRESS);
  console.log('From:', account.address);
  
  // 直接发送 ETH 到合约 (合约有 receive() 函数)
  const hash = await walletClient.sendTransaction({
    to: CONTRACT_ADDRESS,
    value: parseEther('2'),
  });
  
  console.log('Transaction hash:', hash);
  
  // 等待确认
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');
  
  // 查询余额
  const balance = await publicClient.getBalance({ address: CONTRACT_ADDRESS });
  console.log('Pool balance:', balance.toString(), 'wei');
  console.log('Pool balance:', Number(balance) / 1e18, 'MON');
}

main().catch(console.error);
