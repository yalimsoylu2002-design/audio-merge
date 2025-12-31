import express from "express";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const app = express();
app.use(express.json({ limit: "200mb" }));

app.get("/", (req, res) => res.send("ok"));

app.post("/merge-base64", async (req, res) => {
  try {
    const files = req.body?.files;
    if (!Array.isArray(files) || files.length < 1) {
      return res.status(400).json({ error: "files array gerekli" });
    }

    // temp klasör
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-"));
    const listPath = path.join(dir, "list.txt");
    const outPath = path.join(dir, "merged.mp3");

    // base64 mp3'leri diske yaz
    const filePaths = files.map((f, i) => {
      const name = f.name || `part-${i + 1}.mp3`;
      const p = path.join(dir, name);
      fs.writeFileSync(p, Buffer.from(f.b64, "base64"));
      return p;
    });

    // concat listesi (ffmpeg concat demuxer)
    const listContent = filePaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
    fs.writeFileSync(listPath, listContent);

    // ffmpeg çalıştır
    const ff = spawn(ffmpegPath, [
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      outPath
    ]);

    let err = "";
    ff.stderr.on("data", d => (err += d.toString()));

    ff.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "ffmpeg failed", detail: err.slice(-2000) });
      }
      const buf = fs.readFileSync(outPath);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", "attachment; filename=merged.mp3");
      return res.send(buf);
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Server running on", PORT));
