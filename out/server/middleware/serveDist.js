// DISABLED: Duplicate static mount - using canonical spaMount.ts only
export function attachStatic(app) {
    // const dist = path.resolve(process.cwd(), "dist");
    // app.use(express.static(dist));
    // app.use((req: Request, res: Response, next: NextFunction) => {
    //   if (req.path.startsWith("/api/")) return next();
    //   res.sendFile(path.join(dist, "index.html"), err => { if (err) next(); });
    // });
    console.warn('[attachStatic] DISABLED - using canonical spaMount.ts only');
}
