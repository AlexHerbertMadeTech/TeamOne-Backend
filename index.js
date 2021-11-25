const WebSocket = require("ws");
const uuidv4 = require("uuidv4");

const wss = new WebSocket.Server({ port: 1428 });

const clients = new Map();

wss.on("connection", (ws) => {
    const id = uuidv4();
    const color = Math.floor(Math.random() * 360);
    const metadata = { id, color };

    clients.set(ws, metadata);

    ws.on("message", (messageAsString) => {});
});
