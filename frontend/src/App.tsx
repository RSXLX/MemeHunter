import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Game from './pages/Game';
import Withdraw from './pages/Withdraw';
import MyRooms from './pages/MyRooms';
import MyClaims from './pages/MyClaims';
import RoomClaims from './pages/RoomClaims';
import './index.css';

// Wallet Adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// 使用自定义 RPC
import { SOLANA_RPC_HOST } from './config/solana';

const queryClient = new QueryClient();

function App() {
  // Solana 网络配置 - 使用 Helius RPC 避免公共节点限制
  const endpoint = useMemo(() => SOLANA_RPC_HOST, []);
  
  // 钱包适配器
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SocketProvider>
              <BrowserRouter>
                <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e]">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/game" element={<Game />} />
                    <Route path="/game/:roomId" element={<Game />} />
                    <Route path="/r/:roomId" element={<Game />} />
                    <Route path="/withdraw" element={<Withdraw />} />
                    <Route path="/my-rooms" element={<MyRooms />} />
                    <Route path="/my-claims" element={<MyClaims />} />
                    <Route path="/room/:roomId/claims" element={<RoomClaims />} />
                  </Routes>
                </div>
              </BrowserRouter>
            </SocketProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}

export default App;


