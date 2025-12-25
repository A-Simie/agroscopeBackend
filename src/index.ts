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

const allowedOrigins = [
  "https://agroscope.vercel.app",
  "http://localhost:5173",
  "http://localhost:5175",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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

export default app;
