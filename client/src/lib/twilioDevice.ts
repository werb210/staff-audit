import { API_BASE } from "../config";
import { Device } from "@twilio/voice-sdk";

declare global { interface Window { twilioDevice?: any; twilioInit?: Promise<any>; } }

export async function getTwilioDevice() {
  if (window.twilioDevice) return window.twilioDevice;
  if (window.twilioInit)   return window.twilioInit;

  window.twilioInit = (async () => {
    const r = await fetch(`${API_BASE}/twilio/token", { credentials: "include" });
    if (!r.ok) throw new Error(`Token fetch failed: ${r.status}`);
    const { token } = await r.json();
    if (!token || typeof token !== "string") throw new Error("Empty token");

    const [, p] = token.split(".");
    console.log("[Twilio] JWT payload:", JSON.parse(atob(p)));

    const device = new Device(token, { debug: true });
    device.on("ready", () => console.log("[Twilio] Device ready"));
    
    device.on("error", (error: any) => {
      const msg = `[TwilioDevice] Error ${error.code}: ${error.message}`;
      console.error(msg, error);
      const el = document.querySelector("#dialer-status");
      if (el) {
        el.textContent = msg;
        el.classList.remove("text-green-600");
        el.classList.add("text-red-600");
      }
    });

    device.on("connect", () => {
      console.log("[TwilioDevice] Connected successfully");
      const el = document.querySelector("#dialer-status");
      if (el) {
        el.textContent = "✅ Dialer ready!";
        el.classList.remove("text-red-600");
        el.classList.add("text-green-600");
      }
    });

    device.on("disconnect", () => {
      console.warn("[TwilioDevice] Disconnected");
      const el = document.querySelector("#dialer-status");
      if (el) {
        el.textContent = "⚠️ Disconnected";
        el.classList.remove("text-green-600");
        el.classList.add("text-yellow-600");
      }
    });
    
    device.on("tokenWillExpire", async () => {
      const r2 = await fetch(`${API_BASE}/twilio/token", { credentials: "include" });
      const { token: t2 } = await r2.json();
      device.updateToken(t2);
    });

    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const outs = devs.filter(d => d.kind === "audiooutput");
      if (outs[0]) (Device.audio as any).speakerDevices.set(outs[0].deviceId);
    } catch {}

    await device.register();
    window.twilioDevice = device;
    return device;
  })();

  return window.twilioInit;
}
