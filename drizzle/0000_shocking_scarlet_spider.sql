-- 1. Ensure we operate in the public schema consistently
SET search_path = public, pg_catalog;

-- 2. We don't need to create the auth schema or auth.users—Supabase manages it.

-- 3. Define note_status enum once in public
CREATE TYPE note_status AS ENUM (
  'private',
  'public',
  'archived',
  'pinned'
);

-- 4. Create tags table
CREATE TABLE IF NOT EXISTS noted_tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Create notes table
CREATE TABLE IF NOT EXISTS noted_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  content    text        NOT NULL,
  status     note_status DEFAULT 'private'      NOT NULL,
  created_at timestamptz DEFAULT now()          NOT NULL,
  updated_at timestamptz DEFAULT now()          NOT NULL
);

-- 6. Create join table (note ↔ tag)
CREATE TABLE IF NOT EXISTS noted_note_tags (
  note_id uuid NOT NULL REFERENCES noted_notes(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES noted_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 7. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_noted_notes_user ON noted_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_noted_notes_title ON noted_notes(title);
CREATE UNIQUE INDEX IF NOT EXISTS uq_noted_tags_user_name ON noted_tags (
  lower(name),
  user_id
);

-- 8. Automatically stamp updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_notes_updated ON noted_notes;
CREATE TRIGGER trg_update_notes_updated
BEFORE UPDATE ON noted_notes
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_update_tags_updated ON noted_tags;
CREATE TRIGGER trg_update_tags_updated
BEFORE UPDATE ON noted_tags
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 9. Enable RLS on each table
ALTER TABLE noted_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE noted_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE noted_note_tags  ENABLE ROW LEVEL SECURITY;

-- 10. RLS policies for noted_tags
DROP POLICY IF EXISTS select_tags ON noted_tags;
CREATE POLICY select_tags ON noted_tags
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_tags ON noted_tags;
CREATE POLICY insert_tags ON noted_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_tags ON noted_tags;
CREATE POLICY update_tags ON noted_tags
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_tags ON noted_tags;
CREATE POLICY delete_tags ON noted_tags
  FOR DELETE USING (auth.uid() = user_id);

-- 11. RLS policies for noted_notes
DROP POLICY IF EXISTS select_notes ON noted_notes;
CREATE POLICY select_notes ON noted_notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_notes ON noted_notes;
CREATE POLICY insert_notes ON noted_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_notes ON noted_notes;
CREATE POLICY update_notes ON noted_notes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_notes ON noted_notes;
CREATE POLICY delete_notes ON noted_notes
  FOR DELETE USING (auth.uid() = user_id);

-- 12. RLS policies for noted_note_tags
DROP POLICY IF EXISTS select_note_tags ON noted_note_tags;
CREATE POLICY select_note_tags ON noted_note_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM noted_notes nn
      WHERE nn.id = noted_note_tags.note_id
        AND nn.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS insert_note_tags ON noted_note_tags;
CREATE POLICY insert_note_tags ON noted_note_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM noted_notes nn
      WHERE nn.id = noted_note_tags.note_id
        AND nn.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM noted_tags nt
      WHERE nt.id = noted_note_tags.tag_id
        AND nt.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS delete_note_tags ON noted_note_tags;
CREATE POLICY delete_note_tags ON noted_note_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM noted_notes nn
      WHERE nn.id = noted_note_tags.note_id
        AND nn.user_id = auth.uid()
    )
  );
