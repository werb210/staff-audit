export async function watchBuildVersion() {
    if (import.meta.env.PROD)
        return;
    const res = await fetch("/__version", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
    const current = res?.build || "";
    const seen = sessionStorage.getItem("__build");
    if (current && seen && current !== seen) {
        const ok = confirm("New build detected. Reload now?");
        if (ok)
            location.reload();
    }
    if (current)
        sessionStorage.setItem("__build", current);
}
