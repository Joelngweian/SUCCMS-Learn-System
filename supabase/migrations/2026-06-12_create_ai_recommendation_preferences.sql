CREATE TABLE IF NOT EXISTS public.ai_recommendation_preferences (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  feedback TEXT CHECK (feedback IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, recommendation_id)
);

ALTER TABLE public.ai_recommendation_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI recommendation preferences"
  ON public.ai_recommendation_preferences;
CREATE POLICY "Users can view own AI recommendation preferences"
  ON public.ai_recommendation_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own AI recommendation preferences"
  ON public.ai_recommendation_preferences;
CREATE POLICY "Users can create own AI recommendation preferences"
  ON public.ai_recommendation_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own AI recommendation preferences"
  ON public.ai_recommendation_preferences;
CREATE POLICY "Users can update own AI recommendation preferences"
  ON public.ai_recommendation_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own AI recommendation preferences"
  ON public.ai_recommendation_preferences;
CREATE POLICY "Users can delete own AI recommendation preferences"
  ON public.ai_recommendation_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.ai_recommendation_preferences
  TO authenticated;

NOTIFY pgrst, 'reload schema';
