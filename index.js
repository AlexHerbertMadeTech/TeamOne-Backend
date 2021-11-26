const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 1428 });
let gameLoopInterval;

const worldFloor = 400;
const worldEnd = 1200;
const clients = new Map();
var availableActions = [
    // 'jump',
    'duck',
    'attack',
    'spectate'
    ];
var player = {width: 50, height: 100, x: 100, y: worldFloor - 50, id: 123, type: 'player', jumping: false, ducking: false, attacking: false, jumpSpeed: 0, jumpFrames: 0, duckFrames : 0};
var entities = [];
var score = 0;
let gameSpeed = 8;
let backgroundPosition1 = 0;
let backgroundPosition2 = worldEnd * 2;

class obstacle {
    constructor(height, width, id, type, y) {
        this.height = height;
        this.width = width;
        this.x = worldEnd + (width / 2);
        this.y = y;
        this.type = type;
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
class jumpObstacle extends obstacle {
    constructor(height, width, id) {
        super(height, width, id, 'jumpObstacle', (worldFloor - (height / 2 )));
    }
}

class duckObstacle extends obstacle {
    constructor(height, width, id) {
        super(height, width, id, 'duckObstacle', (worldFloor - (height / 2 ) - (0.75 * player.height)));
    };
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
    if (data.event == 'jump' && !isPlayerDoingAction()) {
        player.jumpFrames = 14;
        player.jumpSpeed = 14;
        player.jumping = true;
    } else if (data.event == 'duck' && !isPlayerDoingAction()) {
        player.duckFrames = 38;
        player.ducking = true;
    } else if (data.event == 'attack' && !isPlayerDoingAction()) {
        // TODO: Actual attacking logic
        player.attacking = true;
    }
}

function isPlayerDoingAction() {
    return player.jumping || player.ducking || player.attacking
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
    var obstacles = [jumpObstacle, duckObstacle]
    if (spawn) {
        chanceToSpawn = 500;
        var id = Math.floor((Math.random() * 1000) + 1);
        const randomObstacle = Math.floor((Math.random() * obstacles.length));
        let obstacle = obstacles[randomObstacle];
        entities.push(new obstacle(50, 50, id));
    } else {
        chanceToSpawn--;
    }

    playerJumpLogic();
    playerDuckLogic();
    
    let isDead = false;
    entities.forEach(entity => {
        entity.move(gameSpeed)
        if (entity.collide(player)) {
            isDead = true;
        }
    });

    // This is a dodgy hack to get the "infinite" scroll feel
    backgroundPosition1 -= gameSpeed;
    backgroundPosition2 -= gameSpeed;
    if (backgroundPosition1 < -worldEnd) {
        backgroundPosition1 = backgroundPosition2 + (worldEnd * 2);
    } else if (backgroundPosition2 < -worldEnd) {
        backgroundPosition2 = backgroundPosition1 + (worldEnd * 2);
    }

    const frame =  {
        event: 'gameUpdate',
        player: player,
        obstacles: entities,
        score: score,
        backgroundPosition1: backgroundPosition1,
        backgroundPosition2: backgroundPosition2,
        actions: {
            jumping: player.jumping,
            ducking: player.ducking,
            attacking: player.attacking
        }
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

function playerDuckLogic() {
    if (player.duckFrames > 0) {
        player.duckFrames--;
    } else if (player.duckFrames == 0) {
        player.ducking = false;
    }
}

console.log("Application started");