import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from './components/SolanaWalletProvider';
import Home from './pages/Home';
import Game from './pages/Game';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <SolanaWalletProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/game" element={<Game />} />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </SolanaWalletProvider>
  );
}

export default App;
