import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "/tmp" });

app.get("/", (req, res) => {
  res.send("ok");
});

app.post("/merge", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length < 2) {
      return res.status(400).json({ error: "En az 2 ses dosyası gerekli" });
    }

    const listPath = "/tmp/list.txt";
    const outputPath = "/tmp/output.mp3";

    const listContent = files
      .map(f => `file '${f.path}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    exec(
      `ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${outputPath}`,
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "ffmpeg hatası" });
        }

        res.sendFile(outputPath, () => {
          files.forEach(f => fs.unlinkSync(f.path));
          fs.unlinkSync(listPath);
          fs.unlinkSync(outputPath);
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
