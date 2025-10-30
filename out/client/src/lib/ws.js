export function openAppSocket(path, jwt) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const qp = new URLSearchParams();
    if (jwt)
        qp.set("token", jwt);
    const url = `${proto}://${location.host}${path}?${qp.toString()}`;
    const ws = new WebSocket(url);
    // keepalive
    let ping;
    ws.addEventListener("open", () => {
        ping = setInterval(() => ws.readyState === 1 && ws.send("__ping__"), 25000);
    });
    ws.addEventListener("close", () => ping && clearInterval(ping));
    return ws;
}
