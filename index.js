const WebSocket = require("ws");
const uuidv4 = require("uuidv4");

const wss = new WebSocket.Server({ port: 1428 });

const clients = new Map();
var player = {width: 100, height: 100, x: 100, y: 600, id: 123, type: 'player'};
var entities = [];

class jumpObstacle {
    constructor(height, width, id) {
        this.height = height;
        this.width = width;
        this.x = 800;
        this.y = 600;
        this.id = id;
    }

    move() {
        this.x--;
    }
}

var chanceToSpawn = 1000;

wss.on("connection", (ws) => {
    console.log('New connection')
    
    generateClient(ws)
    ws.send(JSON.stringify(clients.get(ws)))
    
    gameLoop();
    
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

function gameLoop() {
    interval = 1000 / 30;
    setInterval(calculateFrame(), interval);

    
}

function calculateFrame() {
    var spawn = Math.floor((Math.random() * chanceToSpawn) + 1) === 1;
    if(spawn){
        chanceToSpawn = 1000;
        var id = Math.floor((Math.random() * 1000) + 1);
        entities.push(new jumpObstacle(100, 100, id));
    }else{
        chanceToSpawn -= 10;
    };

    entities.forEach(entity => {
        entity.move()
    });

    const frame =  {
        event: gameUpdate,
        player: player,
        obstacles: entities
    };

    [...clients.keys()].forEach(client => {
        client.send(frame)
    });
}

console.log("Application started");