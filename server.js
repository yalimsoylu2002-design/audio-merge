import express from "express";

const app = express();

// Railway health check
app.get("/", (req, res) => {
  res.send("ok");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
