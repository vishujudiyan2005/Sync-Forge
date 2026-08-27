import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Eraser, Square, Circle, Minus, ArrowUpRight, Trash2 } from "lucide-react";

const USER_COLORS = [
    "#f26a21", "#2e9f73", "#a86e49", "#5575b6",
    "#c05b82", "#8f65b7", "#4c9d9c", "#d29b32",
];

const TOOLS = {
    PEN: "pen",
    ERASER: "eraser",
    RECTANGLE: "rectangle",
    ELLIPSE: "ellipse",
    LINE: "line",
    ARROW: "arrow",
} as const;
type Tool = typeof TOOLS[keyof typeof TOOLS];

type Point = { x: number; y: number };

type WhiteboardElement =
    | { kind: "stroke"; points: Point[]; lineWidth: number; tool: "pen" | "eraser"; author: string; ts?: number }
    | { kind: "shape"; shape: "rectangle" | "ellipse" | "line" | "arrow"; start: Point; end: Point; lineWidth: number; author: string; ts?: number };

function getUserColor(username: string) {
    if (!username) return USER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

interface WhiteboardProps {
    roomId: string;
    username: string;
    socket: WebSocket | null;
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawPolyline(ctx: CanvasRenderingContext2D, points: Point[]) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, start: Point, end: Point, size: number) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const left = { x: end.x - size * Math.cos(angle - Math.PI / 6), y: end.y - size * Math.sin(angle - Math.PI / 6) };
    const right = { x: end.x - size * Math.cos(angle + Math.PI / 6), y: end.y - size * Math.sin(angle + Math.PI / 6) };
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(left.x, left.y);
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
}

function drawElement(ctx: CanvasRenderingContext2D, element: WhiteboardElement, preview = false) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = element.lineWidth;
    ctx.globalAlpha = preview ? 0.78 : 1;

    if (element.kind === "stroke") {
        ctx.strokeStyle = element.tool === "eraser" ? "rgba(0,0,0,1)" : getUserColor(element.author);
        if (element.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
        drawPolyline(ctx, element.points);
        ctx.restore();
        return;
    }

    ctx.strokeStyle = getUserColor(element.author);
    const { start, end } = element;
    const w = end.x - start.x;
    const h = end.y - start.y;

    if (element.shape === "rectangle") ctx.strokeRect(start.x, start.y, w, h);
    else if (element.shape === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(start.x + w / 2, start.y + h / 2, Math.max(1, Math.abs(w) / 2), Math.max(1, Math.abs(h) / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        if (element.shape === "arrow") drawArrowHead(ctx, start, end, Math.max(10, element.lineWidth * 4));
    }
    ctx.restore();
}

export default function Whiteboard({ roomId, username, socket }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const startPoint = useRef<Point | null>(null);
    const currentPath = useRef<Point[]>([]);
    const elementsRef = useRef<WhiteboardElement[]>([]);
    const [tool, setTool] = useState<Tool>(TOOLS.PEN);
    const [lineWidth, setLineWidth] = useState(3);
    const [authorColors, setAuthorColors] = useState<Record<string, string>>({});
    const [drawing, setDrawing] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number, y: number, updated_at: number }>>({});
    const lastCursorSend = useRef(0);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const myColor = useMemo(() => getUserColor(username), [username]);
    const isShapeTool = tool !== TOOLS.PEN && tool !== TOOLS.ERASER;

    const redraw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        clearCanvas(ctx);
        for (const element of elementsRef.current) drawElement(ctx, element);
    };

    const triggerAutoSave = () => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const canvas = canvasRef.current;
            if (canvas) localStorage.setItem(`whiteboard_${roomId}`, JSON.stringify(elementsRef.current));
        }, 700);
    };

    const getPos = (e: React.PointerEvent, canvas: HTMLCanvasElement): Point => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const previewCurrentElement = (e: React.PointerEvent) => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const ctx = overlay.getContext("2d");
        if (!ctx) return;
        clearCanvas(ctx);
        const current = getPos(e, overlay);
        if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
            const points = [...currentPath.current, current];
            drawElement(ctx, { kind: "stroke", points, lineWidth, tool, author: username }, true);
        } else if (startPoint.current) {
            const shape = tool as "rectangle" | "ellipse" | "line" | "arrow";
            drawElement(ctx, { kind: "shape", shape, start: startPoint.current, end: current, lineWidth, author: username }, true);
        }
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        overlayRef.current?.setPointerCapture?.(e.pointerId);
        isDrawing.current = true;
        setDrawing(true);
        setCursorPos({ x: e.clientX, y: e.clientY });
        const pos = overlayRef.current ? getPos(e, overlayRef.current) : { x: 0, y: 0 };
        startPoint.current = pos;
        currentPath.current = [pos];
    };

    const onPointerMove = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCursorPos({ x: e.clientX, y: e.clientY });
        const overlay = overlayRef.current;
        if (!overlay) return;
        const pos = getPos(e, overlay);
        const now = Date.now();
        if (now - lastCursorSend.current > 45) {
            socket?.send(JSON.stringify({ type: "whiteboard_cursor", roomId, x: pos.x, y: pos.y, username }));
            lastCursorSend.current = now;
        }
        if (!isDrawing.current) return;
        if (tool === TOOLS.PEN || tool === TOOLS.ERASER) currentPath.current.push(pos);
        previewCurrentElement(e);
    };

    const onPointerUp = (e?: React.PointerEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!isDrawing.current || !overlayRef.current) return;
        isDrawing.current = false;
        setDrawing(false);
        const end = e ? getPos(e, overlayRef.current) : (currentPath.current[currentPath.current.length - 1] || startPoint.current);
        if (!end) return;

        let element: WhiteboardElement | null = null;
        if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
            if (currentPath.current.length >= 2) element = { kind: "stroke", points: [...currentPath.current, end], lineWidth, tool, author: username, ts: Date.now() };
        } else if (startPoint.current) {
            const shape = tool as "rectangle" | "ellipse" | "line" | "arrow";
            element = { kind: "shape", shape, start: startPoint.current, end, lineWidth, author: username, ts: Date.now() };
        }

        const overlayCtx = overlayRef.current.getContext("2d");
        if (overlayCtx) clearCanvas(overlayCtx);
        currentPath.current = [];
        startPoint.current = null;
        if (!element) return;

        elementsRef.current.push(element);
        redraw();
        setAuthorColors(prev => ({ ...prev, [username]: myColor }));
        triggerAutoSave();
        socket?.send(JSON.stringify({ type: "whiteboard_element", roomId, element }));
    };

    useEffect(() => {
        if (!socket) return;
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "whiteboard_element" && data.element) {
                    elementsRef.current.push(data.element);
                    redraw();
                    triggerAutoSave();
                    if (data.element.author) setAuthorColors(prev => ({ ...prev, [data.element.author]: getUserColor(data.element.author) }));
                } else if (data.type === "whiteboard_stroke" && data.stroke) {
                    const legacy = { kind: "stroke" as const, ...data.stroke } as WhiteboardElement;
                    elementsRef.current.push(legacy);
                    redraw();
                    triggerAutoSave();
                    if (legacy.author) setAuthorColors(prev => ({ ...prev, [legacy.author]: getUserColor(legacy.author) }));
                } else if (data.type === "whiteboard_cursor") {
                    setRemoteCursors(prev => ({ ...prev, [data.username]: { x: data.x, y: data.y, updated_at: Date.now() } }));
                } else if (data.type === "whiteboard_clear") {
                    elementsRef.current = [];
                    redraw();
                    setAuthorColors({});
                    localStorage.removeItem(`whiteboard_${roomId}`);
                }
            } catch { /* ignore malformed room events */ }
        };
        socket.addEventListener("message", handleMessage);
        return () => socket.removeEventListener("message", handleMessage);
    }, [socket, roomId, username]);

    useEffect(() => {
        const saved = localStorage.getItem(`whiteboard_${roomId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as WhiteboardElement[];
                if (Array.isArray(parsed)) {
                    elementsRef.current = parsed;
                    redraw();
                    const colors: Record<string, string> = {};
                    parsed.forEach(el => { if (el.author) colors[el.author] = getUserColor(el.author); });
                    setAuthorColors(colors);
                }
            } catch { /* stale local board data */ }
        }
        const interval = setInterval(() => {
            const now = Date.now();
            setRemoteCursors(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => { if (now - next[key].updated_at > 3000) delete next[key]; });
                return next;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, [roomId]);

    const clearBoard = () => {
        elementsRef.current = [];
        redraw();
        setAuthorColors({});
        localStorage.removeItem(`whiteboard_${roomId}`);
        socket?.send(JSON.stringify({ type: "whiteboard_clear", roomId }));
    };

    const toolButton = (value: Tool, icon: React.ReactNode, label: string) => (
        <button
            type="button"
            onClick={() => setTool(value)}
            className={`neu-btn !shadow-none inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${tool === value ? "!text-[var(--brand)] neu-inset" : "text-[var(--muted)]"}`}
            title={label}
        >
            {icon}<span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--page)]">
            <div className="neu-raised flex flex-wrap items-center gap-2 px-4 py-3 !rounded-none">
                <div className="mr-2 flex items-center gap-2">
                    <span className="neu-flat grid h-8 w-8 place-items-center text-[var(--brand)]">✦</span>
                    <div>
                        <p className="text-xs font-extrabold text-[var(--text-strong)]">Whiteboard</p>
                        <p className="text-[10px] text-[var(--muted)]">Draw together</p>
                    </div>
                </div>
                {toolButton(TOOLS.PEN, <Pencil size={13} />, "Pen")}
                {toolButton(TOOLS.ERASER, <Eraser size={13} />, "Eraser")}
                <div className="mx-1 h-5 w-px bg-[var(--border)]" />
                {toolButton(TOOLS.RECTANGLE, <Square size={13} />, "Rectangle")}
                {toolButton(TOOLS.ELLIPSE, <Circle size={13} />, "Circle")}
                {toolButton(TOOLS.LINE, <Minus size={13} />, "Line")}
                {toolButton(TOOLS.ARROW, <ArrowUpRight size={13} />, "Arrow")}
                <div className="neu-inset ml-2 flex items-center gap-2 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Size</span>
                    <input type="range" min={1} max={14} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} style={{ width: 72, accentColor: "var(--brand)" }} />
                    <span className="w-5 text-right text-xs font-bold text-[var(--text)]">{lineWidth}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {Object.entries(authorColors).map(([author, color]) => (
                        <div key={author} className="hidden items-center gap-1.5 sm:flex">
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                            <span className="max-w-[140px] truncate text-[10px] font-semibold text-[var(--muted)]">{author === username ? "You" : author}</span>
                        </div>
                    ))}
                    <button type="button" onClick={clearBoard} className="neu-btn !shadow-none inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold !text-[var(--color-destructive)]">
                        <Trash2 size={13} /> Clear
                    </button>
                </div>
            </div>

            <div className="neu-inset relative min-h-0 flex-1 overflow-hidden !rounded-none">
                <canvas ref={canvasRef} width={1600} height={900} className="absolute inset-0 h-full w-full" />
                <canvas
                    ref={overlayRef}
                    width={1600}
                    height={900}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onPointerLeave={(e) => { if (isDrawing.current) onPointerUp(e); }}
                    className="absolute inset-0 h-full w-full"
                    style={{ touchAction: "none", cursor: isShapeTool ? "crosshair" : tool === TOOLS.ERASER ? "cell" : "crosshair" }}
                />

                {drawing && (
                    <div className="pointer-events-none fixed z-[999] flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-2 py-1 text-[10px] font-bold text-[var(--brand-ink)] shadow-lg" style={{ left: cursorPos.x + 12, top: cursorPos.y + 12 }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-ink)]" />{username || "Vishu Judiyan"}
                    </div>
                )}

                {Object.entries(remoteCursors).map(([uname, pos]) => {
                    const color = getUserColor(uname);
                    return (
                        <div key={uname} className="pointer-events-none absolute z-[998] flex items-center gap-1 transition-all duration-75" style={{ left: `${(pos.x / 1600) * 100}%`, top: `${(pos.y / 900) * 100}%` }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>
                            <span style={{ background: color, color: "white", padding: "3px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", transform: "translate(-3px, 9px)", boxShadow: "0 5px 14px rgba(0,0,0,.18)" }}>{uname}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
