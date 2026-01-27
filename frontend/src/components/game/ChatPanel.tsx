import { useState, useEffect, useRef } from 'react';
// import { useTranslation } from 'react-i18next';

// Interfaces
export interface ChatMessage {
    id: string;
    sender: string;
    avatar?: string; // Optional avatar URL or emoji
    content: string;
    timestamp: number;
    isSystem?: boolean;
    color?: string; // User name color
}

export default function ChatPanel() {
    // const { t } = useTranslation(); // Unused for now in mock mode
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputMessage, setInputMessage] = useState('');

    // Mock Messages State
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            sender: 'SYSTEM',
            content: 'Welcome to System Room #888!',
            timestamp: Date.now() - 100000,
            isSystem: true,
        },
        {
            id: '2',
            sender: 'Hunter_X',
            content: 'LFG! This room is lit 🔥',
            timestamp: Date.now() - 50000,
            color: '#F43F5E',
        },
        {
            id: '3',
            sender: 'CryptoDoge',
            content: 'Anyone see the golden meme?',
            timestamp: Date.now() - 20000,
            color: '#3b82f6',
        },
    ]);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputMessage.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'You',
            content: inputMessage,
            timestamp: Date.now(),
            color: '#7C3AED', // Primary color for "You"
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <h3 className="flex-none p-4 text-secondary font-display uppercase tracking-widest text-xs border-b border-white/5 flex items-center gap-2">
                <span>💬</span> Global Chat
                <span className="ml-auto text-[10px] text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    LIVE
                </span>
            </h3>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center my-2' : 'items-start'}`}>
                        {msg.isSystem ? (
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-text/50 font-mono tracking-wide">
                                {msg.content}
                            </span>
                        ) : (
                            <div className="flex gap-3 max-w-full">
                                {/* Avatar Placeholder */}
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border border-white/10 shrink-0"
                                    style={{ backgroundColor: `${msg.color}20`, color: msg.color }}
                                >
                                    {msg.sender[0].toUpperCase()}
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            className="text-xs font-bold hover:underline cursor-pointer transition-colors"
                                            style={{ color: msg.color }}
                                        >
                                            {msg.sender}
                                        </span>
                                        <span className="text-[10px] text-text/30 font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text/90 break-words leading-relaxed mt-0.5">
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-none p-3 border-t border-white/5 bg-black/40">
                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 placeholder:text-text/20 transition-all font-sans"
                        placeholder="Type a message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />
                    <button
                        type="submit"
                        disabled={!inputMessage.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-white disabled:opacity-30 disabled:hover:text-primary transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
