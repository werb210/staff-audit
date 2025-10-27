import express from "express";
import contactsRouter from "./routes/contacts.js";

const app = express();

// Mount exactly as in index.ts
app.use("/api/contacts", contactsRouter);

// Utility to walk Express routes
function listRoutes(app: express.Express) {
  const routes: string[] = [];
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push(middleware.route.path);
    } else if (middleware.name === "router" && middleware.handle.stack) {
      middleware.handle.stack.forEach((handler: any) => {
        const path = handler.route?.path;
        if (path) routes.push(path);
      });
    }
  });
  return routes;
}

console.log("🔍 Active routes:");
console.log(listRoutes(app));

console.log("\n✅ Test GET /api/contacts/seed ...");

import http from "http";
const server = http.createServer(app);

server.listen(process.env.PORT || 8080, "0.0.0.0", () => {
  console.log("🧪 Route listing server on http://0.0.0.0:4000");
});
