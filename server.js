import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

const app = express();

// JSON body okuyabilsin diye ŞART:
app.use(express.json({ limit: "200mb" }));

app.get("/", (req, res) => res.send("ok"));

app.post("/merge-base64", async (req, res) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files[] missing" });
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-"));
    const listPath = path.join(dir, "list.txt");

    // dosyaları yaz
    const writtenPaths = files.map((f, i) => {
      const b64 = f?.b64;
      if (!b64 || typeof b64 !== "string") {
        throw new Error(`files[${i}].b64 missing`);
      }
      const buf = Buffer.from(b64, "base64");
      const p = path.join(dir, `part-${String(i).padStart(3, "0")}.mp3`);
      fs.writeFileSync(p, buf);
      return p;
    });

    // ffmpeg concat list
    const listContent = writtenPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(listPath, listContent);

    const outPath = path.join(dir, "merged.mp3");

    // Re-encode ile en stabil merge:
    const args = [
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c:a", "libmp3lame",
      "-q:a", "2",
      outPath
    ];

    await new Promise((resolve, reject) => {
      execFile("ffmpeg", args, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      });
    });

    const outBuf = fs.readFileSync(outPath);
    const outB64 = outBuf.toString("base64");

    // cleanup (best-effort)
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}

    return res.json({ filename: "merged.mp3", b64: outB64 });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running on", PORT));
