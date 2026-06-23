const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

// Porta Railway o 8080 in locale
const PORT = process.env.PORT || 8080;

// SERVER HTTP (serve index.html, client.js, style.css)
const server = http.createServer((req, res) => {
    let filePath = "." + req.url;

    if (filePath === "./") filePath = "./index.html";

    const ext = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css"
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end("File non trovato");
            return;
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
    });
});

// SERVER WEBSOCKET
const wss = new WebSocket.Server({ server });

console.log("Server avviato su PORTA:", PORT);

// UTENTI IN MEMORIA
const users = []; // { username, password }

let secret = Math.floor(Math.random() * 50) + 1;

function safeSend(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

function broadcast(msg) {
    wss.clients.forEach(c => safeSend(c, msg));
}

wss.on("connection", ws => {
    console.log("Nuovo client connesso");

    ws.logged = false;
    ws.username = null;

    safeSend(ws, "Benvenuto! Inserisci nome e password per accedere.");

    ws.on("message", raw => {
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            safeSend(ws, "Errore: messaggio non valido");
            return;
        }

        // LOGIN
        if (data.type === "login") {
            const existing = users.find(u => u.username === data.username);

            if (!existing) {
                users.push({
                    username: data.username,
                    password: data.password
                });

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

        // BLOCCA CHI NON È LOGGATO
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

    ws.on("close", () => console.log("Client disconnesso"));
});

// AVVIO SERVER HTTP + WS
server.listen(PORT, () => {
    console.log("HTTP + WebSocket attivi su PORTA:", PORT);
});
