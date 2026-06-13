-- Remove the unused legacy social-post schema.
-- Current course posts use course_posts.
-- Current discussions use forum_threads, forum_replies,
-- forum_reactions, and forum_reply_reactions.

DROP VIEW IF EXISTS public.post_engagement;

DROP TABLE IF EXISTS public.reactions;
DROP TABLE IF EXISTS public.post_views;
DROP TABLE IF EXISTS public.post_likes;
DROP TABLE IF EXISTS public.post_comments;
DROP TABLE IF EXISTS public.posts;
