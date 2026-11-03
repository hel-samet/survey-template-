-- Survey Checkbox System — PostgreSQL schema
-- Safe to run multiple times (idempotent).
--
-- Translatable fields are JSONB objects keyed by language code, e.g. {"en": "Hello", "km": "សួស្តី"}.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Surveys -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surveys (
  id          SERIAL PRIMARY KEY,
  title       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  description JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS surveys_updated_at ON surveys;
CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Questions -----------------------------------------------------------------
-- options:  [{"id": "opt_a1b2", "label": {"en": "...", "km": "..."}}, ...]
-- settings: per-type config, e.g. rating {"max": 5}, scale {"min": 0, "max": 10, "minLabel": {...}, "maxLabel": {...}}
-- Type list must match backend/src/validators/questionTypes.js.
CREATE TABLE IF NOT EXISTS questions (
  id          SERIAL PRIMARY KEY,
  survey_id   INTEGER     NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  text        JSONB       NOT NULL,
  type        VARCHAR(20) NOT NULL,
  options     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  settings    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_required BOOLEAN     NOT NULL DEFAULT FALSE,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrades databases created before more answer types were added.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN (
  'checkbox', 'radio', 'dropdown', 'yesno', 'rating', 'scale',
  'text', 'paragraph', 'number', 'email', 'phone', 'date'
));

CREATE INDEX IF NOT EXISTS idx_questions_survey_position ON questions (survey_id, position);

DROP TRIGGER IF EXISTS questions_updated_at ON questions;
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Responses -----------------------------------------------------------------
-- answers: {"<questionId>": "optionId" | ["optionId", ...] | "free text"}
CREATE TABLE IF NOT EXISTS responses (
  id              SERIAL PRIMARY KEY,
  survey_id       INTEGER      NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_name VARCHAR(120),
  answers         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_survey_created ON responses (survey_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_created ON responses (created_at DESC);

-- Telegram settings (single row, id = 1) ----------------------------------
CREATE TABLE IF NOT EXISTS telegram_settings (
  id         SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bot_token  TEXT,
  chat_id    TEXT,
  enabled    BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS telegram_settings_updated_at ON telegram_settings;
CREATE TRIGGER telegram_settings_updated_at BEFORE UPDATE ON telegram_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
