CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_users_must_differ CHECK (follower_id <> following_id),
  CONSTRAINT follows_follower_following_unique UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_created
  ON public.follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_following_created
  ON public.follows(following_id, created_at DESC);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.follows;
CREATE POLICY "Authenticated users can view follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users can follow active profiles" ON public.follows;
CREATE POLICY "Users can follow active profiles"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_id = auth.uid()
    AND follower_id <> following_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles target
      WHERE target.id = following_id
        AND target.role <> 'admin'
        AND COALESCE(target.is_active, TRUE)
    )
  );

DROP POLICY IF EXISTS "Users can unfollow profiles" ON public.follows;
CREATE POLICY "Users can unfollow profiles"
  ON public.follows FOR DELETE
  TO authenticated
  USING (
    follower_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles current_profile
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'admin'
    )
  );

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_user_followed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'Someone')
  INTO actor_name
  FROM public.user_profiles
  WHERE id = NEW.follower_id;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE $notification$
      INSERT INTO public.notifications (
        recipient_id,
        actor_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        metadata,
        dedupe_key
      )
      VALUES ($1, $2, 'new_follower', $3, $4, 'follow', $5, $6, $7, $8)
      ON CONFLICT (dedupe_key) DO NOTHING
    $notification$
    USING
      NEW.following_id,
      NEW.follower_id,
      actor_name || ' started following you',
      'View their profile.',
      NEW.id,
      '/profile/' || NEW.follower_id,
      jsonb_build_object('follow_id', NEW.id),
      'follow:' || NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_user_followed_insert ON public.follows;
CREATE TRIGGER notify_user_followed_insert
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_followed();

NOTIFY pgrst, 'reload schema';
