import WebSocket, { WebSocketServer } from "ws";
import { verifyJwt } from "../services/authService.js";
import { chatService } from "../services/chatService.js";

export const initWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: WebSocket, req: any) => {
    const token = new URL(req.url, "http://x").searchParams.get("token");
    if (!token) return ws.close();

    const user = await verifyJwt(token);
    if (!user) return ws.close();

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        const { applicationId, body } = data;

        await chatService.send(applicationId, user.id, body);

        ws.send(JSON.stringify({ ok: true }));
      } catch {
        ws.send(JSON.stringify({ error: "Invalid format" }));
      }
    });
  });
};

export default initWebSocket;
