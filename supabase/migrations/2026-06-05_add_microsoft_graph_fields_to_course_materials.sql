ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS ms_drive_id TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS ms_drive_item_id TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS ms_web_url TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS ms_edit_url TEXT;

ALTER TABLE public.course_materials
ADD COLUMN IF NOT EXISTS ms_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_course_materials_ms_drive_item_id
  ON public.course_materials(ms_drive_item_id);
