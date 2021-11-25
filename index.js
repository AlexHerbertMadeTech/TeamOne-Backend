const WebSocket = require("ws");
const uuidv4 = require("uuidv4");

const wss = new WebSocket.Server({ port: 1428 });

const clients = new Map();

wss.on("connection", (ws) => {
    console.log('New connection')
    
    generateClient(ws)
    ws.send(JSON.stringify(clients.get(ws)))
    
    
    // const metadata ={ id: Math.random() * 360 };
    // clients.set(ws, metadata);

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

function generateClient(ws) {
    var clientId = Math.floor((Math.random() * 1000) + 1);
    var availableActions = ['jump', 'duck', 'shoot'];
    [...clients.keys()].forEach(element => {
        if (element.action == 'jump'){
            availableActions = availableActions.filter(item => item !== 'jump')
        }
        if (element.action == 'duck'){
            availableActions = availableActions.filter(item => item !== 'duck')
        }
        if (element.action == 'shoot'){
            availableActions = availableActions.filter(item => item !== 'shoot')
        }
    });
    //TODO Deal with what happens if there's more than 4 people
    var clientDetails = {
        event: 'startup',
        id: clientId,
        action: availableActions[0]
    }
    clients.set(ws, clientDetails)
}

console.log("Application started");