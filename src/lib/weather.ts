import axios from "axios";

interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  cloud_cover: number;
  weather_code: number;
}

interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}

export interface WeatherSummary {
  summary: string;
  temperatureC: number;
  humidity: number;
  precipitationMm: number;
  cloudCover: number;
}

export interface ForecastDay {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
}

export interface WeatherForecast {
  current: WeatherSummary;
  daily: ForecastDay[];
}

const describeWeather = (current: OpenMeteoCurrent): string => {
  const { temperature_2m, relative_humidity_2m, precipitation, cloud_cover } =
    current;

  const parts: string[] = [];

  parts.push(
    `Current field conditions are about ${Math.round(
      temperature_2m
    )}°C with roughly ${relative_humidity_2m}% humidity.`
  );

  if (precipitation > 0) {
    parts.push(
      `There is active rainfall (${precipitation.toFixed(
        1
      )} mm), which can strongly increase the risk of fungal and bacterial diseases.`
    );
  } else {
    parts.push(
      "There is little to no rainfall at the moment, but morning dew or irrigation can still keep leaves wet."
    );
  }

  if (cloud_cover > 70) {
    parts.push(
      "Skies are mostly cloudy, so leaves may stay wet longer, which favors disease development."
    );
  } else if (cloud_cover < 30) {
    parts.push(
      "Skies are mostly clear, helping leaves dry faster and slightly reducing disease pressure."
    );
  } else {
    parts.push(
      "Skies are partly cloudy, so disease pressure will depend on how long leaves remain wet."
    );
  }

  parts.push(
    "Monitor humidity and leaf wetness closely over the next 24–48 hours, as these strongly affect most crop diseases in West Africa."
  );

  return parts.join(" ");
};

export const getWeatherSummary = async (
  latitude: number,
  longitude: number
): Promise<WeatherSummary | null> => {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code";

    const response = await axios.get(url);

    if (!response.data?.current) {
      return null;
    }

    const current = response.data.current as OpenMeteoCurrent;

    return {
      summary: describeWeather(current),
      temperatureC: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      precipitationMm: current.precipitation,
      cloudCover: current.cloud_cover,
    };
  } catch {
    return null;
  }
};

export const getWeatherForecast = async (
  latitude: number,
  longitude: number
): Promise<WeatherForecast | null> => {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&current=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&timezone=auto";

    const response = await axios.get(url);

    if (!response.data?.current || !response.data?.daily) {
      return null;
    }

    const current = response.data.current as OpenMeteoCurrent;
    const daily = response.data.daily as OpenMeteoDaily;

    const forecastDays: ForecastDay[] = daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index] ?? 0,
      tempMax: daily.temperature_2m_max[index] ?? 0,
      tempMin: daily.temperature_2m_min[index] ?? 0,
      precipitationProbability: daily.precipitation_probability_max[index] ?? 0,
    }));

    return {
      current: {
        summary: describeWeather(current),
        temperatureC: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitationMm: current.precipitation,
        cloudCover: current.cloud_cover,
      },
      daily: forecastDays,
    };
  } catch {
    return null;
  }
};
