ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS reminder_offsets_minutes INTEGER[] NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS public.personal_task_notifications (task_id UUID NOT NULL REFERENCES public.personal_tasks(id) ON DELETE CASCADE,offset_minutes INTEGER NOT NULL,sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(task_id,offset_minutes));
ALTER TABLE public.personal_task_notifications ENABLE ROW LEVEL SECURITY;
