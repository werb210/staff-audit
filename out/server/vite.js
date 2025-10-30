import { createServer } from "vite";
export async function createViteServer(server) {
    const vite = await createServer({
        server: {
            middlewareMode: true,
            hmr: { server },
            allowedHosts: true,
        },
    });
    return vite;
}
