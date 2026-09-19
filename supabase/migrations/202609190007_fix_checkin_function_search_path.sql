ALTER FUNCTION public.record_addiction_checkin(UUID, DATE, TEXT, TEXT) SET search_path = public, extensions;
ALTER FUNCTION public.reset_addiction_tracker(UUID) SET search_path = public, extensions;
