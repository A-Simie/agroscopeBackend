import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "./config/passport";
import authRouter from "./routes/auth.route";
import scanRouter from "./routes/scan.route";
import weatherRouter from "./routes/weather.route";

const app = express();
const PORT = process.env.PORT || 4000;

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(passport.initialize());

app.get("/", (_req, res) => {
  res.json({ message: "AgroScope API is running", status: "healthy" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/scan", scanRouter);
app.use("/api/weather", weatherRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`AgroScope API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
