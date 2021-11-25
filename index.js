const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 1428 });
let gameLoopInterval;

const worldFloor = 600;
const clients = new Map();
var availableActions = ['jump', 'duck', 'shoot', 'spectate'];
var player = {width: 100, height: 100, x: 100, y: 550, id: 123, type: 'player', jump: 0 };
var entities = [];
var score = 0;

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
    
    if (clients.size == 1) {
        gameLoop();
    }

    ws.on('message', (data) => {
        let message = JSON.parse(data);
        console.log(message);
        processEvent(ws, message);
    });
});

function processEvent(ws, data) {
    if (data.event == 'jump') {
        player.jump = 10;
        console.log("Jump!");
    }
}

function generateClient(ws) {
    var clientId = Math.floor((Math.random() * 1000) + 1);

    //TODO Deal with what happens if there's more than 4 people <- It's called spectators :p
    var clientDetails = {
        event: 'startup',
        id: clientId,
        action: availableActions[0]
    }

    if (availableActions.length > 1) {
        availableActions.shift();
    }

    clients.set(ws, clientDetails)
}

function gameLoop() {
    interval = 1000 / 30;
    gameLoopInterval = setInterval(calculateFrame, interval);
}

function calculateFrame() {
    score++;
    var spawn = Math.floor((Math.random() * chanceToSpawn) + 1) === 1;
    if (spawn) {
        chanceToSpawn = 500;
        var id = Math.floor((Math.random() * 1000) + 1);
        entities.push(new jumpObstacle(100, 100, id));
    } else {
        chanceToSpawn--;
    }

    if (player.jump > 0) {
        player.y--;
        player.jump--;
    } else if (player.y < worldFloor - (player.height / 2)) {
        player.y++;
    }

    let isDead = false;
    entities.forEach(entity => {
        entity.move()
        if (entity.collide(player)) {
            isDead = true;
        }
    });

    const frame =  {
        event: 'gameUpdate',
        player: player,
        obstacles: entities,
        score: score
    };

    [...clients.keys()].forEach(client => {
        client.send(JSON.stringify(frame))
    });

    if (isDead) {
        console.log("Dead - Game over");
        clearInterval(gameLoopInterval);
        [...clients.keys()].forEach(client => {
            client.send(JSON.stringify({
                event: "death"
            }));
        });
    }
}

console.log("Application started");