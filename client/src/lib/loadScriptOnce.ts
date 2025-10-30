export async function loadScriptOnce(id: string, src: string) {
  if (document.getElementById(id)) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
