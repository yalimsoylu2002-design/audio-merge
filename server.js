import express from "express";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
app.use(express.json({ limit: "200mb" }));

app.post("/merge", (req, res) => {
  const segments = req.body?.segments;
  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: "segments array required" });
  }

  segments.sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-"));
  const listPath = path.join(dir, "list.txt");

  const filePaths = segments.map((s, i) => {
    const p = path.join(dir, `seg_${String(i).padStart(3, "0")}.mp3`);
    fs.writeFileSync(p, Buffer.from(s.audio_b64, "base64"));
    return p;
  });

  fs.writeFileSync(
    listPath,
    filePaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n")
  );

  const outPath = path.join(dir, "out.mp3");

  execFile(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "ffmpeg failed", details: String(err) });
      }

      const out = fs.readFileSync(outPath);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", "attachment; filename=podcast.mp3");
      res.send(out);
    }
  );
});

app.get("/", (_, res) => res.send("ok"));
app.listen(process.env.PORT || 3000);
