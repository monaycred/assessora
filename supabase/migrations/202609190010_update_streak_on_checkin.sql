CREATE OR REPLACE FUNCTION public.record_addiction_checkin(
  p_tracker_id UUID, p_date DATE, p_status TEXT, p_source TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_tracker addiction_trackers%ROWTYPE;
  v_checkin_id UUID;
  v_days INTEGER;
BEGIN
  IF p_status NOT IN ('success', 'lapse', 'support') OR p_source NOT IN ('app', 'whatsapp') THEN
    RAISE EXCEPTION 'Resposta inválida';
  END IF;
  SELECT * INTO v_tracker FROM addiction_trackers WHERE id = p_tracker_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Rastreador não encontrado'; END IF;
  INSERT INTO addiction_daily_checkins (tracker_id, checkin_date, reply_code)
  VALUES (p_tracker_id, p_date, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)))
  ON CONFLICT (tracker_id, checkin_date) DO NOTHING;
  UPDATE addiction_daily_checkins
    SET status = p_status, responded_at = NOW(), source = p_source
    WHERE tracker_id = p_tracker_id AND checkin_date = p_date AND status = 'pending'
    RETURNING id INTO v_checkin_id;
  IF v_checkin_id IS NULL THEN RETURN false; END IF;
  v_days := greatest(0, floor(extract(epoch FROM (NOW() - v_tracker.started_at)) / 86400)::integer);
  IF p_status = 'success' THEN
    UPDATE addiction_trackers SET
      current_streak_days = greatest(1, v_days),
      best_streak_days = greatest(best_streak_days, greatest(1, v_days)),
      updated_at = NOW()
      WHERE id = p_tracker_id;
  ELSIF p_status = 'lapse' THEN
    INSERT INTO addiction_resets (tracker_id, streak_before, reason)
    VALUES (p_tracker_id, v_days, 'checkin');
    UPDATE addiction_trackers SET
      started_at = NOW(), current_streak_days = 0,
      best_streak_days = greatest(best_streak_days, v_days),
      attempt_count = attempt_count + 1, updated_at = NOW()
      WHERE id = p_tracker_id;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.record_addiction_checkin(UUID, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_addiction_checkin(UUID, DATE, TEXT, TEXT) TO service_role;

-- Corrige jornadas que já receberam uma resposta positiva hoje antes desta atualização.
UPDATE public.addiction_trackers tracker SET
  current_streak_days = greatest(1, floor(extract(epoch FROM (NOW() - tracker.started_at)) / 86400)::integer),
  best_streak_days = greatest(tracker.best_streak_days, greatest(1, floor(extract(epoch FROM (NOW() - tracker.started_at)) / 86400)::integer)),
  updated_at = NOW()
WHERE tracker.is_active = true AND EXISTS (
  SELECT 1 FROM public.addiction_daily_checkins checkin
  WHERE checkin.tracker_id = tracker.id AND checkin.status = 'success'
    AND checkin.checkin_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
);
