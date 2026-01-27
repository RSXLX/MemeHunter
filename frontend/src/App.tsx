import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Game from './pages/Game';
import Withdraw from './pages/Withdraw';
import MyRooms from './pages/MyRooms';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
            </Routes>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;


