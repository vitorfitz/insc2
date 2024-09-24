const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const gameOffers = new Map();
const offerers = new Map();

const ids = new Map();
const usedIDs = new Set();

class Game {
    constructor(conn, connID) {
        this.conn = conn;
        this.connID = connID;
        this.unsentMsgs = [];
    }
}

const games = new Map();
const unregister = [];
const broadcast = [];

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        broadcast.push({ sender: ws, content: message });
        handleMessages();
    });

    ws.on('close', () => {
        unregister.push(ws);
        handleMessages();
    });
});

function writeMessage(client, data) {
    console.log(`>${data}`);
    client.send(data, (err) => {
        if (err) {
            console.log(`Error writing message: ${err}`);
            client.close();
            ids.delete(client);
            return false;
        }
    });
    return true;
}

let nextID = 0;
let nextGame = 0;

const codeCreateGame = "C";
const codeJoinGame = "J";
const codeQuit = "Q";
const codeGameOver = "O";
const codeDeleteOffer = "D";
const codeListGames = "L";

function handleMessages() {
    while (unregister.length > 0) {
        const client = unregister.shift();
        if (ids.has(client)) {
            const id = ids.get(client);
            ids.delete(client);
            usedIDs.delete(id);
            if (offerers.has(client)) {
                const name = offerers.get(client);
                gameOffers.delete(name);
                offerers.delete(client);
            }

            if (games.has(id)) {
                const game = games.get(id);
                if (!game.conn) {
                    games.delete(id);
                    games.delete(game.connID);
                } else {
                    writeMessage(game.conn, codeQuit);
                    games.get(game.connID).conn = null;
                }
            }
        }
    }

    while (broadcast.length > 0) {
        const { sender, content } = broadcast.shift();
        let myID = ids.get(sender);

        if (myID === undefined) {
            let id = parseInt(content.toString());
            if (isNaN(id)) {
                writeMessage(sender, '-1');
            } else {
                if (id === -1) {
                    id = nextID++;
                }
                while (usedIDs.has(id)) {
                    id = nextID++;
                }
                writeMessage(sender, id.toString());

                ids.set(sender, id);
                usedIDs.add(id);

                if (games.has(id)) {
                    writeMessage(games.get(id).conn, codeJoinGame);
                }
            }
        } else {
            switch (content.toString()[0]) {
                case codeCreateGame:
                    const j = JSON.parse(content.toString().slice(1));
                    if (!j.name) {
                        j.name = `game${nextGame++}`;
                    }

                    if (!gameOffers.has(j.name)) {
                        if (offerers.has(sender)) {
                            gameOffers.delete(offerers.get(sender));
                        }
                        gameOffers.set(j.name, { conn: sender, data: j.data });
                        offerers.set(sender, j.name);
                        writeMessage(sender, '{}');
                    } else {
                        writeMessage(sender, '{"error":"Name already exists!","code":0}');
                    }
                    break;

                case codeJoinGame:
                    const joinData = JSON.parse(content.toString().slice(1));
                    const gameOffer = gameOffers.get(joinData.name);

                    if (!gameOffer) {
                        writeMessage(sender, '{"error":"Game was deleted","code":0}');
                    } else {
                        const otherID = ids.get(gameOffer.conn);
                        games.set(myID, new Game(gameOffer.conn, otherID));
                        games.set(otherID, new Game(sender, myID));

                        const coinflip = Math.floor(Math.random() * 2);
                        if (!joinData.data) {
                            joinData.data = {};
                        }
                        joinData.data.myTurn = coinflip;
                        writeMessage(gameOffer.conn, JSON.stringify(joinData.data));

                        gameOffer.data.myTurn = 1 - coinflip;
                        writeMessage(sender, JSON.stringify(gameOffer.data));

                        gameOffers.delete(joinData.name);
                        offerers.delete(gameOffer.conn);
                    }
                    break;

                case codeGameOver:
                    if (games.has(myID)) {
                        const opp = games.get(myID);
                        games.delete(ids.get(opp.conn));
                    }
                    games.delete(myID);
                    break;

                case codeDeleteOffer:
                    if (offerers.has(sender)) {
                        gameOffers.delete(offerers.get(sender));
                        offerers.delete(sender);
                        writeMessage(sender, '{}');
                    }
                    break;

                case codeListGames:
                    const gameList = [];
                    gameOffers.forEach((value, key) => {
                        gameList.push({ name: key, data: value.data });
                    });
                    writeMessage(sender, JSON.stringify(gameList));
                    break;

                default:
                    if (games.has(myID)) {
                        const game = games.get(myID);
                        if (!game.conn) {
                            game.unsentMsgs.push(content.toString());
                        } else {
                            writeMessage(game.conn, content);
                        }
                    }
                    break;
            }
        }
    }
}

server.listen(8080, () => {
    console.log(`Server is listening on port 8080`);
});