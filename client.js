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
    ws = new WebSocket(getWsUrl());

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
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    ws.send(JSON.stringify({
        type: "login",
        username: user,
        password: pass
    }));
}

function sendGuess() {
    const val = document.getElementById("guess").value;

    ws.send(JSON.stringify({
        type: "guess",
        value: val
    }));
}
