const WebSocket = require("ws");
const uuidv4 = require("uuidv4");

const wss = new WebSocket.Server({ port: 1428 });

const clients = new Map();

wss.on("connection", (ws) => {
    console.log('New connection')

    const metadata ={ id: Math.random() * 360 };
    clients.set(ws, metadata);

    ws.on("message", (message) => {
        console.log("Message: " + message)
        processMessage(ws, message)
    });
});

function processMessage(ws, message) {
    if (message == 'Hello Server!') {
        console.log("About to send message")
        ws.send("Test")
    }
}

console.log("Application started");