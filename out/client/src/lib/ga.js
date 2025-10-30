let inited = false;
const MID = import.meta.env.VITE_GA_MEASUREMENT_ID;
export function initGA() {
    if (inited || !MID)
        return;
    // inject gtag, CSP-safe (no inline string eval)
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${MID}`;
    document.head.appendChild(s1);
    const s2 = document.createElement("script");
    s2.type = "text/javascript";
    s2.text = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); window.__gtagCalls = (window.__gtagCalls||[]); window.__gtagCalls.push(arguments); }
  gtag('js', new Date()); gtag('config', '${MID}');
  `;
    document.head.appendChild(s2);
    inited = true;
}
export function pageview(path) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.gtag?.("event", "page_view", { page_path: path });
}
export function event(name, params = {}) {
    // @ts-ignore
    window.gtag?.("event", name, params);
}
