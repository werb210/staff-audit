import archiver from "archiver";
import { getObjectStream } from "./s3";
export async function streamZip(res, files, zipName = "documents.zip") {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => { throw err; });
    archive.pipe(res);
    for (const f of files) {
        try {
            const s = await getObjectStream(f.key);
            archive.append(s, { name: f.name || f.key.split("/").pop() || "file" });
        }
        catch (e) {
            archive.append(`Missing or unreadable: ${f.key}\n`, { name: (f.name || f.key) + ".ERROR.txt" });
        }
    }
    await archive.finalize();
}
