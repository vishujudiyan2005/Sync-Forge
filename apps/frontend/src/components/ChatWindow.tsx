import { Send, ImagePlus, X, Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    imageUrl?: string;
    isAi?: boolean;
}

interface ChatWindowProps {
    messages: ChatMessage[];
    localUserId: string;
    onSendMessage: (text: string, imageUrl?: string) => void;
}

export const ChatWindow = ({ messages, localUserId, onSendMessage }: ChatWindowProps) => {
    const [inputValue, setInputValue] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto scroll to bottom when new messages arrive
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_DIMENSION = 800; // Resize to ensure websocket payload stays small
                let width = img.width;
                let height = img.height;

                if (width > height && width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                } else if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress highly for WebSocket payload
                const base64 = canvas.toDataURL("image/jpeg", 0.6); 
                setSelectedImage(base64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (inputValue.trim() || selectedImage) {
            onSendMessage(inputValue.trim(), selectedImage || undefined);
            setInputValue("");
            setSelectedImage(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="neu-raised overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-[var(--border)] shrink-0">
                <h3 className="text-[var(--text-strong)] font-semibold text-sm">Group Chat</h3>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--muted)] text-sm">
                        No messages yet. Say hi!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isLocal = msg.senderId === localUserId;
                        const isAi = msg.isAi || msg.senderId === "ai-assistant";
                        const alignmentClass = isLocal ? "ml-auto items-end" : "mr-auto items-start";
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[90%] ${alignmentClass}`}
                            >
                                <span className="text-[10px] text-[var(--muted)] mb-1 ml-1 flex items-center gap-1">
                                    {isAi && <Bot size={12} className="text-[var(--brand)]" />}
                                    {isLocal ? "You" : msg.senderName} • {formatTime(msg.timestamp)}
                                </span>
                                <div
                                    className={`px-3.5 py-2.5 rounded-[var(--radius)] text-sm break-words flex flex-col gap-2 transition-all duration-200 ${
                                        isLocal
                                            ? "neu-btn-primary rounded-br-md"
                                            : isAi
                                                ? "neu-flat rounded-bl-md text-[var(--text)]"
                                                : "neu-flat rounded-bl-md text-[var(--text)]"
                                    }`}
                                >
                                    {msg.imageUrl && (
                                        <div className="relative group select-none">
                                            <img 
                                                src={msg.imageUrl} 
                                                alt="attached" 
                                                className="max-w-full h-auto rounded-md max-h-48 object-contain cursor-zoom-in transition-all duration-200 hover:scale-[1.02]" 
                                                onDoubleClick={() => setExpandedImageUrl(msg.imageUrl || null)}
                                            />
                                            <div className="absolute bottom-1 right-1 bg-[var(--panel)]/90 text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none select-none">
                                                Double-click to expand
                                            </div>
                                        </div>
                                    )}
                                    {msg.text && (
                                        isAi ? (
                                            <ReactMarkdown 
                                                components={{
                                                    code({node, inline, className, children, ...props}: any) {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return !inline && match ? (
                                                           <pre className="neu-inset p-3 overflow-x-auto mt-2 mb-2 text-[11px] font-mono text-[var(--brand)]">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                           </pre>
                                                        ) : (
                                                           <code className="bg-[var(--panel-3)] px-1 py-0.5 rounded text-[var(--brand)] font-mono text-xs" {...props}>
                                                                {children}
                                                           </code>
                                                        )
                                                    },
                                                    p({children}) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p> },
                                                    a({children, href}) { return <a href={href} className="text-[var(--brand)] hover:underline">{children}</a> },
                                                    ul({children}) { return <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul> },
                                                    ol({children}) { return <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol> },
                                                    strong({children}) { return <strong className="font-semibold text-[var(--text-strong)]">{children}</strong> }
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        ) : (
                                            <span>{msg.text}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[var(--border)] shrink-0 flex flex-col gap-2">
                {selectedImage && (
                    <div className="relative self-start mt-1">
                        <div className="neu-inset relative overflow-hidden flex items-center justify-center p-1" style={{ maxWidth: "150px", maxHeight: "150px" }}>
                            <img src={selectedImage} alt="Preview" className="max-w-full max-h-32 object-contain" />
                            <button 
                                type="button"
                                onClick={() => setSelectedImage(null)}
                                className="neu-icon-btn !shadow-none absolute top-1 right-1 p-1 !text-[var(--text)]"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSend} className="flex items-center gap-2 w-full min-w-0">
                    <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                    <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="neu-icon-btn !shadow-none p-2 flex-shrink-0"
                    >
                        <ImagePlus size={20} />
                    </button>
                    
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="neu-input flex-1 min-w-0 w-full text-sm px-3 py-2"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() && !selectedImage}
                        className="neu-icon-btn !shadow-none p-2.5 flex-shrink-0 !text-[var(--brand)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>

            {/* Expanded Image Modal overlay */}
            {expandedImageUrl && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
                    onClick={() => setExpandedImageUrl(null)}
                >
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .animate-fade-in {
                            animation: fadeIn 0.2s ease-out forwards;
                        }
                        .animate-scale-in {
                            animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                        }
                    `}</style>
                    {/* Close Button */}
                    <button 
                        onClick={() => setExpandedImageUrl(null)}
                        className="neu-icon-btn !shadow-none absolute top-4 right-4 p-2 z-50 !text-[var(--text-strong)]"
                    >
                        <X size={24} />
                    </button>
                    {/* Expanded Image */}
                    <img 
                        src={expandedImageUrl} 
                        alt="expanded view" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                    />
                </div>
            )}
        </div>
    );
};
