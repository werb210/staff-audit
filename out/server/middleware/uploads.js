import multer from "multer";
import { mkdirSync } from "fs";
import path from "path";
export function appDocsUpload(appIdParam = "id") {
    const storage = multer.diskStorage({
        destination: (req, _file, cb) => {
            const appId = req.params[appIdParam];
            const dir = path.join("/tmp/applications", appId, "docs");
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
            cb(null, `${Date.now()}__${safe}`);
        }
    });
    return multer({ storage }).array("files", 20); // field MUST be "files"
}
