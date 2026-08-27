import { Users, Mic, MicOff, Camera, CameraOff, Video as VideoIcon, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface User {
    id: string;
    name: string;
}

interface UserListProps {
    users: User[];
    roomId: string;
    localUserId?: string;
    localUserName?: string;
    localStream?: MediaStream | null;
    remoteStreams?: Record<string, MediaStream>;
    micEnabled?: boolean;
    videoEnabled?: boolean;
    toggleMic?: () => void;
    toggleVideo?: () => void;
}

const VideoStream = ({ stream, muted = false, onClick }: { stream: MediaStream | null, muted?: boolean, onClick?: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div 
            onClick={onClick}
            className="neu-inset relative overflow-hidden w-full aspect-video mt-2 cursor-pointer transition-all duration-200"
        >
            {stream ? (
                <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
            ) : (
                <div className="flex items-center justify-center h-full w-full text-[var(--muted)]">
                    <VideoIcon size={24} />
                </div>
            )}
            <div className="absolute top-2 right-2 rounded px-2 py-1 text-xs bg-[var(--panel)]/90 text-[var(--text)] opacity-0 hover:opacity-100 transition-opacity duration-200">
                Click to Zoom
            </div>
        </div>
    );
};

export const UserList = ({ 
    users, roomId, localUserId, localUserName, localStream, remoteStreams, 
    micEnabled, videoEnabled, toggleMic, toggleVideo 
}: UserListProps) => {
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
    const [zoomedStream, setZoomedStream] = useState<{ stream: MediaStream | null, label: string } | null>(null);

    const generateUserColor = (name: string) => {
        // Muted, sober avatar tones — no neon gradients.
        const colors = [
            "bg-[var(--brand)]",
            "bg-[var(--brown)]",
            "bg-[#6f8f6b]",
            "bg-[#a8623d]",
            "bg-[#7d6650]",
            "bg-[var(--brand-strong)]",
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedUsers(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const remoteUsers = users.filter(u => u.id !== localUserId && u.name !== localUserName);

    return (
        <>
            <div className="space-y-4">
                {/* Users Section */}
                <div className="neu-raised p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-[var(--brand)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                            Users ({users.length})
                        </h3>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                        
                        {/* Local User First */}
                        {localUserName && (
                            <div className="neu-inset flex flex-col p-3 transition-all duration-200">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={(e) => toggleExpand('local', e)}
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--brand-ink)] font-semibold text-sm bg-[var(--brand)] shadow-lg">
                                        {localUserName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[var(--text-strong)] font-medium truncate">{localUserName} (You)</p>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-400">Active</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); toggleMic?.(); }} className={`neu-icon-btn !shadow-none p-1.5 !text-[var(--text)] ${micEnabled ? '' : '!text-[var(--color-destructive)]'}`}>
                                            {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); toggleVideo?.(); }} className={`neu-icon-btn !shadow-none p-1.5 !text-[var(--text)] ${videoEnabled ? '' : '!text-[var(--color-destructive)]'}`}>
                                            {videoEnabled ? <Camera size={14} /> : <CameraOff size={14} />}
                                        </button>
                                    </div>
                                </div>
                                {expandedUsers['local'] && (
                                    <VideoStream stream={localStream || null} muted={true} onClick={() => setZoomedStream({ stream: localStream || null, label: 'You' })} />
                                )}
                            </div>
                        )}

                        {/* Remote Users */}
                        {remoteUsers.map((user) => (
                            <div key={user.id} className="neu-flat flex flex-col p-3 transition-all duration-200 hover:-translate-y-0.5">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={(e) => toggleExpand(user.id, e)}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[var(--brand-ink)] font-semibold text-sm shadow-lg ${generateUserColor(user.name)}`}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[var(--text-strong)] font-medium truncate">{user.name}</p>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-green-400">Active</span>
                                        </div>
                                    </div>
                                </div>
                                {expandedUsers[user.id] && (
                                    <VideoStream stream={remoteStreams?.[user.id] || null} onClick={() => setZoomedStream({ stream: remoteStreams?.[user.id] || null, label: user.name })} />
                                )}
                            </div>
                        ))}

                        {users.length === 0 && (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-[var(--muted)] mx-auto mb-2" />
                                <p className="text-[var(--muted)]">No users connected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Invitation Code Section */}
                <div className="neu-raised p-4">
                    <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-[var(--text-strong)]">Room details</h3><p className="mt-0.5 text-[11px] text-[var(--muted)]">Use the header Invite button to share this room.</p></div><span className="neu-flat px-2 py-1 text-[10px] font-bold text-[var(--brand)]">LIVE</span></div>
                    <div className="neu-inset p-3">
                            <code className="font-mono-app text-sm break-all text-[var(--brand)]">
                                {roomId || "Loading..."}
                            </code>
                    </div>
                </div>
            </div>

            {/* Zoomed Video Modal */}
            {zoomedStream && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="neu-raised relative w-full max-w-5xl overflow-hidden aspect-video">
                        <button 
                            onClick={() => setZoomedStream(null)}
                            className="neu-icon-btn !shadow-none absolute top-4 right-4 z-10 p-2 !text-[var(--text)]"
                        >
                            <X size={24} />
                        </button>
                        <VideoStream stream={zoomedStream.stream} muted={zoomedStream.label === 'You'} />
                        <div className="neu-float absolute bottom-4 left-4 px-4 py-2 text-[var(--text)] font-medium">
                            {zoomedStream.label}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
