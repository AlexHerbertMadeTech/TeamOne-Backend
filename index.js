const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 1428 });
let gameLoopInterval;

const clients = new Map();
var player = {width: 100, height: 100, x: 100, y: 550, id: 123, type: 'player'};
var entities = [];

class jumpObstacle {
    constructor(height, width, id) {
        this.height = height;
        this.width = width;
        this.x = 800;
        this.y = 600 - (height / 2 );
        this.type = 'jumpObstacle';
        this.id = id;
    }

    move() {
        this.x--;
    }
    
    collide(entity) {
        let r1 = { left: this.x - this.width / 2, right: this.x + this.width / 2, top: this.y - this.height / 2, bottom: this.y + this.height / 2 }
        let r2 = { left: entity.x - entity.width / 2, right: entity.x + entity.width / 2, top: entity.y - entity.height / 2, bottom: entity.y + entity.height / 2 }

        return !(r2.left > r1.right || 
            r2.right < r1.left || 
            r2.top > r1.bottom ||
            r2.bottom < r1.top);
    }
}

var chanceToSpawn = 500;

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

    //TODO Deal with what happens if there's more than 4 people <- It's called spectators :p
    var clientDetails = {
        event: 'startup',
        id: clientId,
        action: availableActions[0]
    }

    clients.set(ws, clientDetails)
}

function gameLoop() {
    interval = 1000 / 30;
    gameLoopInterval = setInterval(calculateFrame, interval);
}

function calculateFrame() {
    var spawn = Math.floor((Math.random() * chanceToSpawn) + 1) === 1;
    if (spawn) {
        chanceToSpawn = 500;
        var id = Math.floor((Math.random() * 1000) + 1);
        entities.push(new jumpObstacle(100, 100, id));
    } else {
        chanceToSpawn--;
    }

    let isDead = false;
    entities.forEach(entity => {
        entity.move()
        if (entity.collide(player)) {
            isDead = true;
            console.log("Is Dead");
        }
    });

    const frame =  {
        event: 'gameUpdate',
        player: player,
        obstacles: entities
    };

    [...clients.keys()].forEach(client => {
        client.send(JSON.stringify(frame))
    });

    if (isDead) {
        clearInterval(gameLoopInterval);
        [...clients.keys()].forEach(client => {
            client.send(JSON.stringify({
                event: "death"
            }));
        });
    }
}

console.log("Application started");