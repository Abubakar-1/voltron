"use client";

import { useState, useEffect, useCallback } from "react";

export function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setSocket(ws);
      ws.send(JSON.stringify({ type: "get_initial_state" }));
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
      } catch (err) {
        setError("Failed to parse WebSocket data");
      }
    };

    ws.onerror = (event) => {
      setError("WebSocket error: " + event.message);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback(
    (message) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.error("WebSocket is not open");
      }
    },
    [socket]
  );

  return { data, error, sendMessage };
}
