interface NetConfig {
  size: number;
  name: string;
  radius: number;
  cost: number;
  baseRate: number;
}

interface ControlBarProps {
  selectedNet: number;
  onSelectNet: (size: number) => void;
  netConfig: readonly NetConfig[];
}

export default function ControlBar({ selectedNet, onSelectNet, netConfig }: ControlBarProps) {
  return (
    <footer className="border-t border-white/10 px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Net Size:</span>
          <div className="flex gap-2">
            {netConfig.map((net) => (
              <button
                key={net.size}
                onClick={() => onSelectNet(net.size)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedNet === net.size
                    ? 'bg-monad-purple text-white shadow-lg shadow-monad-purple/30'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {net.size === 0 ? '🔘' : net.size === 1 ? '⚪' : '⭕'} {net.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-gray-400">Cost:</span>
          <span className="text-xl font-semibold text-monad-cyan">
            {netConfig[selectedNet]?.cost || 0.01} MON
          </span>
          <span className="text-gray-500">/hunt</span>
        </div>
      </div>
    </footer>
  );
}
