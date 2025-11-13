-- Add sort_order column to judges table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'judges' 
    AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.judges ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_judges_sort_order ON public.judges(sort_order);

-- Update existing judges to have sequential sort_order based on created_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.judges WHERE sort_order IS NULL OR sort_order = 0) THEN
    WITH numbered_judges AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS new_sort_order
      FROM public.judges
    )
    UPDATE public.judges
    SET sort_order = numbered_judges.new_sort_order
    FROM numbered_judges
    WHERE judges.id = numbered_judges.id;
  END IF;
END $$;

-- Create function to update judge sort orders (similar to hackathons)
CREATE OR REPLACE FUNCTION update_judge_sort_orders(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_record jsonb;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.judges
    SET sort_order = (update_record->>'sort_order')::integer
    WHERE id = (update_record->>'id')::integer;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION update_judge_sort_orders(jsonb) TO authenticated';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
