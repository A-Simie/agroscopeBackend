CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  disease TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommendations JSONB NOT NULL,
  provider TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);