import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "/tmp" });

// health check
app.get("/", (req, res) => {
  res.send("ok");
});

// audio merge endpoint
app.post("/merge", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length < 2) {
      return res.status(400).send("En az 2 ses dosyası gerekli");
    }

    const listPath = "/tmp/list.txt";
    const outputPath = "/tmp/output.mp3";

    const listContent = files
      .map(f => `file '${f.path}'`)
      .join("\n");

    fs.writeFileSync(listPath, listContent);

    const cmd = `ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${outputPath}`;

    exec(cmd, (err) => {
      if (err)

