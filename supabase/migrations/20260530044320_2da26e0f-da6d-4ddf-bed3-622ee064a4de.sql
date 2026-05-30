
CREATE OR REPLACE FUNCTION public.sync_medicine_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medicines
  SET current_stock = NEW.closing_stock,
      updated_at = now()
  WHERE id = NEW.medicine_id;
  RETURN NEW;
END;
$$;
