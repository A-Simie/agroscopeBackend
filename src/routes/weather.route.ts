import { Router, type Request, type Response } from "express";
import { getWeatherSummary, getWeatherForecast } from "../lib/weather";

const router = Router();

router.get("/current", async (req: Request, res: Response): Promise<void> => {
  const latParam = (req.query.lat as string) ?? "6.52";
  const lonParam = (req.query.lon as string) ?? "3.38";

  const latitude = Number(latParam);
  const longitude = Number(lonParam);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res
      .status(400)
      .json({ error: "Invalid lat/lon. Provide numeric coordinates." });
    return;
  }

  const weather = await getWeatherSummary(latitude, longitude);

  if (!weather) {
    res
      .status(503)
      .json({ error: "Weather service unavailable. Try again later." });
    return;
  }

  res.json(weather);
});

router.get("/forecast", async (req: Request, res: Response): Promise<void> => {
  const latParam = (req.query.lat as string) ?? "6.52";
  const lonParam = (req.query.lon as string) ?? "3.38";

  const latitude = Number(latParam);
  const longitude = Number(lonParam);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res
      .status(400)
      .json({ error: "Invalid lat/lon. Provide numeric coordinates." });
    return;
  }

  const forecast = await getWeatherForecast(latitude, longitude);

  if (!forecast) {
    res
      .status(503)
      .json({ error: "Weather service unavailable. Try again later." });
    return;
  }

  res.json(forecast);
});

export default router;
