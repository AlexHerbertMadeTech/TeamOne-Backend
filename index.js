const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 1428 });
let gameLoopInterval;

const worldFloor = 400;
const worldEnd = 1200;
const clients = new Map();
var availableActions = ['jump', 'duck', 'shoot', 'spectate'];
var player = {width: 50, height: 100, x: 100, y: worldFloor - 50, id: 123, type: 'player', jumpFrames: 0, jumping: false, jumpSpeed: 0};
var entities = [];
var score = 0;
let gameSpeed = 10;

class jumpObstacle {
    constructor(height, width, id) {
        this.height = height;
        this.width = width;
        this.x = worldEnd + (width / 2);
        this.y = worldFloor - (height / 2 );
        this.type = 'jumpObstacle';
        this.id = id;
    }

    move(gameSpeed) {
        this.x -= gameSpeed;
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
        processEvent(ws, message);
    });
});

function processEvent(ws, data) {
    if (data.event == 'jump' && !player.jumping) {
        player.jumpFrames = 12;
        player.jumpSpeed = 12;
        player.jumping = true;
    }
}

function generateClient(ws) {
    var clientId = Math.floor((Math.random() * 1000) + 1);

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
        entities.push(new jumpObstacle(50, 50, id));
    } else {
        chanceToSpawn--;
    }

    playerJumpLogic();

    let isDead = false;
    entities.forEach(entity => {
        entity.move(gameSpeed)
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

function playerJumpLogic() {
    if (player.jumpFrames > 0) {
        player.y -= player.jumpSpeed;
        player.jumpFrames--;
        player.jumpSpeed--;
    } else if (player.y < worldFloor - (player.height / 2)) {
        player.y += player.jumpSpeed;
        player.jumpSpeed++;
    } else {
        player.jumping = false;
        player.jumpSpeed = 0;
    }
}

console.log("Application started");