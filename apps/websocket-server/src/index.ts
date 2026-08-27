/**
 * WEBSOCKET SERVER
 *
 * This service can run in two modes:
 *
 * SERVER_TYPE=main
 *   → Main WebSocket server for WebRTC signaling, chat,
 *     whiteboard synchronization, AI responses, etc.
 *
 * SERVER_TYPE=yjs
 *   → Dedicated Yjs WebSocket server for Monaco CRDT synchronization.
 *
 * Render gives each service one public PORT, so the main WebSocket
 * and Yjs servers are deployed as separate Render services.
 */

import http from "http";
import { WebSocketServer } from "ws";
import { createClient } from "redis";
import requestRouter from "./routers/router";
import dotenv from "dotenv";

const { str10_36 } = require("hyperdyperid/lib/str10_36");
const { setupWSConnection } = require("y-websocket/bin/utils");

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const SERVER_TYPE = process.env.SERVER_TYPE || "main";

const rooms: any = {};

/**
 * Generate a unique room ID.
 */
function generateRoomId(): string {
    return str10_36();
}

/**
 * Shared HTTP request handler.
 *
 * IMPORTANT: Render's port scanner (and any uptime/health check)
 * sends a plain HTTP request to the service on boot. If the request
 * handler never calls res.end() for that path, the connection just
 * hangs open with no response, and the scanner will report
 * "No open HTTP ports detected" even though the server is actually
 * listening. Every path must resolve with a response — not just
 * "/health".
 */
function createRequestHandler() {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("OK");
            return;
        }

        // Default handler: respond to everything else (including "/",
        // which is what naive port/health scanners hit first) so the
        // connection never hangs open without a response.
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
    };
}

/**
 * Start the dedicated Yjs WebSocket server.
 *
 * On Render, this service will listen on the PORT
 * provided by Render automatically.
 */
function startYjsServer() {
    const yjsServer = http.createServer(createRequestHandler());

    const yjsWss = new WebSocketServer({
        server: yjsServer,
    });

    yjsWss.on("connection", setupWSConnection);

    yjsServer.listen(PORT, "0.0.0.0", () => {
        console.log(`Yjs WebSocket Server started on port ${PORT}`);
    });
}

/**
 * Start the main WebSocket server.
 */
async function startMainServer() {
    const server = http.createServer(createRequestHandler());

    const wss = new WebSocketServer({
        server,
    });

    if (!process.env.REDIS_URL) {
        throw new Error("REDIS_URL environment variable is missing");
    }

    /**
     * Subscriber client listens to Redis Pub/Sub messages.
     */
    const pubSubClient = createClient({
        url: process.env.REDIS_URL,
    });

    /**
     * Publisher client broadcasts messages to Redis.
     */
    const publisherClient = createClient({
        url: process.env.REDIS_URL,
    });

    pubSubClient.on("error", (err) => {
        console.error("Redis PubSub Client Error:", err);
    });

    publisherClient.on("error", (err) => {
        console.error("Redis Publisher Client Error:", err);
    });

    try {
        console.log("Connecting to Redis...");

        await pubSubClient.connect();
        await publisherClient.connect();

        console.log("Redis clients connected");

        /**
         * Handle WebSocket connections.
         */
        wss.on("connection", async (ws, req) => {
            try {
                console.log("WebSocket connection established");

                const queryString = req.url?.split("?")[1] || "";

                const queryParams = new URLSearchParams(queryString);

                let roomId = queryParams.get("roomId");

                const userId = queryParams.get("id");

                const name = queryParams.get("name");

                /**
                 * Create or join a room.
                 */
                if (!roomId || roomId === "" || !rooms[roomId]) {
                    if (!roomId) {
                        roomId = generateRoomId();
                    }

                    rooms[roomId] = [];

                    ws.send(
                        JSON.stringify({
                            isNewRoom: true,
                            type: "roomId",
                            roomId,
                            message: `Created new room with ID: ${roomId}`,
                        })
                    );

                    console.log(
                        `Created new room with ID: ${roomId}`
                    );
                } else {
                    ws.send(
                        JSON.stringify({
                            isNewRoom: false,
                            type: "roomId",
                            roomId,
                            message: `Joined room with ID: ${roomId}`,
                        })
                    );

                    console.log(
                        `Joined room with ID: ${roomId}`
                    );
                }

                /**
                 * Ensure the room exists.
                 */
                if (!rooms[roomId]) {
                    rooms[roomId] = [];
                }

                /**
                 * Add user to the local room.
                 */
                rooms[roomId].push({
                    userId,
                    ws,
                    name,
                });

                /**
                 * Save the user in Redis.
                 */
                if (userId && name) {
                    await publisherClient.hSet(
                        `room:${roomId}:users`,
                        userId,
                        name
                    );
                }

                /**
                 * Get all users in the room.
                 */
                const allUsersRaw =
                    await publisherClient.hGetAll(
                        `room:${roomId}:users`
                    );

                const allUsers = Object.keys(allUsersRaw).map(
                    (id) => ({
                        id,
                        name: allUsersRaw[id],
                    })
                );

                /**
                 * Broadcast updated users list.
                 */
                await publisherClient.publish(
                    roomId,
                    JSON.stringify({
                        type: "broadcast",
                        excludeUserId: null,
                        data: {
                            type: "users",
                            users: allUsers,
                        },
                    })
                );

                /**
                 * Subscribe to the Redis room channel when
                 * the first local user joins this room.
                 */
                if (
                    rooms[roomId] &&
                    rooms[roomId].length === 1
                ) {
                    await pubSubClient.subscribe(
                        roomId,
                        (message) => {
                            try {
                                const parsed =
                                    JSON.parse(message);

                                /**
                                 * Broadcast message.
                                 */
                                if (
                                    parsed.type === "broadcast"
                                ) {
                                    rooms[roomId]?.forEach(
                                        (user: any) => {
                                            if (
                                                user.userId !==
                                                parsed.excludeUserId
                                            ) {
                                                if (
                                                    user.ws.readyState ===
                                                    user.ws.OPEN
                                                ) {
                                                    user.ws.send(
                                                        JSON.stringify(
                                                            parsed.data
                                                        )
                                                    );
                                                }
                                            }
                                        }
                                    );
                                }

                                /**
                                 * Direct message.
                                 */
                                else if (
                                    parsed.type === "direct"
                                ) {
                                    const targetUser =
                                        rooms[roomId]?.find(
                                            (user: any) =>
                                                user.userId ===
                                                parsed.targetUserId
                                        );

                                    if (
                                        targetUser &&
                                        targetUser.ws.readyState ===
                                            targetUser.ws.OPEN
                                    ) {
                                        targetUser.ws.send(
                                            JSON.stringify(
                                                parsed.data
                                            )
                                        );
                                    }
                                }

                                /**
                                 * Default broadcast.
                                 */
                                else {
                                    rooms[roomId]?.forEach(
                                        (user: any) => {
                                            if (
                                                user.ws.readyState ===
                                                user.ws.OPEN
                                            ) {
                                                user.ws.send(
                                                    JSON.stringify({
                                                        type: "output",
                                                        message,
                                                    })
                                                );
                                            }
                                        }
                                    );
                                }
                            } catch (error) {
                                console.error(
                                    "Error handling Redis message:",
                                    error
                                );

                                rooms[roomId]?.forEach(
                                    (user: any) => {
                                        if (
                                            user.ws.readyState ===
                                            user.ws.OPEN
                                        ) {
                                            user.ws.send(
                                                JSON.stringify({
                                                    type: "output",
                                                    message,
                                                })
                                            );
                                        }
                                    }
                                );
                            }
                        }
                    );
                }

                /**
                 * Handle incoming WebSocket messages.
                 */
                ws.on("message", (message) => {
                    try {
                        const data = JSON.parse(
                            message.toString()
                        );

                        const handler =
                            requestRouter[data.type];

                        if (handler) {
                            handler(data, {
                                userId,
                                roomId,
                                rooms,
                                publisherClient,
                            });
                        } else {
                            console.warn(
                                `Unknown message type: ${data.type}`
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Invalid JSON received:",
                            message.toString()
                        );
                    }
                });

                /**
                 * Handle client disconnection.
                 */
                ws.on("close", async () => {
                    try {
                        if (!rooms[roomId]) {
                            return;
                        }

                        /**
                         * Remove user from local room.
                         */
                        rooms[roomId] = rooms[
                            roomId
                        ].filter(
                            (user: any) =>
                                user.userId !== userId
                        );

                        /**
                         * Remove user from Redis.
                         */
                        if (userId) {
                            await publisherClient.hDel(
                                `room:${roomId}:users`,
                                userId
                            );
                        }

                        /**
                         * Get updated users list.
                         */
                        const allUsersRaw =
                            await publisherClient.hGetAll(
                                `room:${roomId}:users`
                            );

                        const allUsers =
                            Object.keys(
                                allUsersRaw
                            ).map((id) => ({
                                id,
                                name: allUsersRaw[id],
                            }));

                        /**
                         * Broadcast updated users.
                         */
                        await publisherClient.publish(
                            roomId,
                            JSON.stringify({
                                type: "broadcast",
                                excludeUserId: null,
                                data: {
                                    type: "users",
                                    users: allUsers,
                                },
                            })
                        );

                        /**
                         * Clean up empty rooms.
                         */
                        if (
                            rooms[roomId] &&
                            rooms[roomId].length === 0
                        ) {
                            delete rooms[roomId];

                            await pubSubClient.unsubscribe(
                                roomId
                            );

                            console.log(
                                `Room ${roomId} removed`
                            );
                        }

                        console.log(
                            `User disconnected from room ${roomId}`
                        );
                    } catch (error) {
                        console.error(
                            "Error in WebSocket close handler:",
                            error
                        );
                    }
                });

                /**
                 * Handle WebSocket errors.
                 */
                ws.on("error", (error) => {
                    console.error(
                        "WebSocket error:",
                        error
                    );
                });
            } catch (error) {
                console.error(
                    "Error in WebSocket connection:",
                    error
                );

                ws.close();
            }
        });

        /**
         * Start the main WebSocket server.
         */
        server.listen(PORT, "0.0.0.0", () => {
            console.log(
                `Main WebSocket server started on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Failed to start Main WebSocket server:",
            error
        );

        process.exit(1);
    }
}

/**
 * Application entry point.
 */
async function main() {
    try {
        console.log(
            `Starting SyncForge WebSocket service in ${SERVER_TYPE} mode`
        );

        /**
         * YJS MODE
         */
        if (SERVER_TYPE === "yjs") {
            startYjsServer();

            return;
        }

        /**
         * MAIN WEBSOCKET MODE
         */
        await startMainServer();
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
}

main();