export async function loadScriptOnce(id, src) {
    if (document.getElementById(id))
        return;
    await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.id = id;
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
