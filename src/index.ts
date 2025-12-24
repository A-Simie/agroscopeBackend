import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.route";
import scanRouter from "./routes/scan.route";
import weatherRouter from "./routes/weather.route";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
    credentials: false,
    exposedHeaders: ["Authorization"],
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("AgroScope API is running");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.use("/api/scan", scanRouter);
app.use("/api/weather", weatherRouter);

app.listen(PORT, () => {
  console.log(`AgroScope API running on port ${PORT}`);
});
