const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 8080;

const JSONBIN_URL = process.env.JSONBIN_URL;
const JSONBIN_KEY = process.env.JSONBIN_KEY;

// HTTP SERVER (serve index.html, client.js, style.css)
const server = http.createServer((req, res) => {
    let filePath = "." + req.url;
    if (filePath === "./") filePath = "./index.html";

    const ext = path.extname(filePath).toLowerCase();
    const mime = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css"
    }[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end("File non trovato");
            return;
        }
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
    });
});

// WEBSOCKET SERVER
const wss = new WebSocket.Server({ server });

let secret = Math.floor(Math.random() * 50) + 1;

// --- JSONBIN FUNCTIONS ---
async function loadUsers() {
    const res = await fetch(JSONBIN_URL, {
        headers: { "X-Master-Key": JSONBIN_KEY }
    });
    const data = await res.json();
    return data.record.users || [];
}

async function saveUsers(users) {
    await fetch(JSONBIN_URL, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": JSONBIN_KEY
        },
        body: JSON.stringify({ users })
    });
}

function safeSend(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

function broadcast(msg) {
    wss.clients.forEach(c => safeSend(c, msg));
}

wss.on("connection", ws => {
    ws.logged = false;
    ws.username = null;

    safeSend(ws, "Benvenuto! Inserisci nome e password per accedere.");

    ws.on("message", async raw => {
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            safeSend(ws, "Messaggio non valido");
            return;
        }

        // LOGIN
        if (data.type === "login") {
            const users = await loadUsers();
            const existing = users.find(u => u.username === data.username);

            if (!existing) {
                users.push({
                    username: data.username,
                    password: data.password
                });
                await saveUsers(users);

                ws.logged = true;
                ws.username = data.username;
                safeSend(ws, `Registrato e loggato come ${ws.username}`);
                return;
            }

            if (existing.password !== data.password) {
                safeSend(ws, "Password errata");
                return;
            }

            ws.logged = true;
            ws.username = data.username;
            safeSend(ws, `Accesso effettuato come ${ws.username}`);
            return;
        }

        // BLOCCA NON LOGGATI
        if (!ws.logged) {
            safeSend(ws, "Devi prima fare login");
            return;
        }

        // GIOCO
        if (data.type === "guess") {
            const guess = Number(data.value);

            if (guess === secret) {
                broadcast(`🎉 ${ws.username} ha vinto! Il numero era ${secret}`);
                secret = Math.floor(Math.random() * 50) + 1;
            } else if (guess < secret) {
                safeSend(ws, "Troppo basso");
            } else {
                safeSend(ws, "Troppo alto");
            }
        }
    });
});

server.listen(PORT, () => {
    console.log("Server attivo su porta", PORT);
});
