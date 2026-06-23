let ws;
let ws;

function addLog(text) {
    const log = document.getElementById("log");
    log.innerHTML += `<p>${text}</p>`;
    log.scrollTop = log.scrollHeight;
}

function getWsUrl() {
    if (location.hostname === "localhost") {
        return "ws://localhost:8080";
    }
    return "wss://" + location.host;
}

function connect() {
    const url = getWsUrl();
    ws = new WebSocket(url);

    ws.onopen = () => addLog("Connesso al server");

    ws.onmessage = msg => addLog(msg.data);

    ws.onclose = () => {
        addLog("Connessione chiusa, ritento tra 1s...");
        setTimeout(connect, 1000);
    };

    ws.onerror = () => addLog("Errore WebSocket");
}

connect();

function login() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addLog("Connessione non aperta");
        return;
    }

    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
        addLog("Inserisci nome e password");
        return;
    }

    ws.send(JSON.stringify({
        type: "login",
        username: user,
        password: pass
    }));
}

function sendGuess() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addLog("Connessione non aperta");
        return;
    }

    const val = document.getElementById("guess").value;

    if (!val) {
        addLog("Inserisci un numero");
        return;
    }

    ws.send(JSON.stringify({
        type: "guess",
        value: val
    }));
}
