import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "../lib/env";

let socket: Socket | null = null;

export function useSocket(): Socket | null {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_BASE_URL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on("connect", () => {
        console.log("Connected to server");
        setIsConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });

      socket.on("error", (error) => {
        console.error("Socket error:", error);
      });
    }

    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
    };
  }, []);

  return isConnected ? socket : null;
}
