ALTER TABLE public.discovery_items DROP CONSTRAINT IF EXISTS discovery_items_item_type_check;
ALTER TABLE public.discovery_items ADD CONSTRAINT discovery_items_item_type_check
  CHECK (item_type IN ('tip','movie','series','course','event','job'));
