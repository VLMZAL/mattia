const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log("Server WebSocket avviato su ws://localhost:" + PORT);

// UTENTI IN MEMORIA
const users = []; // { username, password }

let secret = Math.floor(Math.random() * 50) + 1;

function safeSend(ws, msg) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
    }
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

    ws.on("close", () => {
        console.log("Client disconnesso");
    });
});
