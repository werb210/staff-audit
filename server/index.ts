import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";

import contactsRouter from "./routes/contacts";
import pipelineRouter from "./routes/pipeline";
import healthRouter from "./routes/_int/index";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

app.use("/api/contacts", contactsRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/_int", healthRouter);

const clientDist = path.join(process.cwd(), "client/dist");
app.use(express.static(clientDist));
app.get("*", (_, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Staff App backend running on http://0.0.0.0:${PORT}`)
);
