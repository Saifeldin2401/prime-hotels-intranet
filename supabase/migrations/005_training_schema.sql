-- Training content block type enum
CREATE TYPE content_block_type AS ENUM (
  'text',
  'image',
  'video',
  'document_link'
);

-- Training quiz type enum
CREATE TYPE quiz_type AS ENUM (
  'mcq',
  'true_false',
  'fill_blank'
);

-- Training progress status enum
CREATE TYPE training_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'expired'
);

-- Training modules table
CREATE TABLE training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  estimated_duration_minutes INTEGER,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training content blocks table
CREATE TABLE training_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  type content_block_type NOT NULL,
  content TEXT NOT NULL,
  order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(training_module_id, order)
);

-- Training quizzes table
CREATE TABLE training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  type quiz_type NOT NULL,
  options TEXT[], -- For MCQ
  correct_answer TEXT NOT NULL,
  order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(training_module_id, order)
);

-- Training assignments table
CREATE TABLE training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to_department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  assigned_to_property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  assigned_to_all BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Training progress table
CREATE TABLE training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  training_id UUID REFERENCES training_modules(id) ON DELETE CASCADE NOT NULL,
  assignment_id UUID REFERENCES training_assignments(id) ON DELETE SET NULL,
  status training_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  quiz_score INTEGER, -- Percentage
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, training_id)
);

-- Training certificates table (for tracking)
CREATE TABLE training_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_progress_id UUID REFERENCES training_progress(id) ON DELETE CASCADE NOT NULL,
  certificate_url TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(training_progress_id)
);

-- Triggers
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at
  BEFORE UPDATE ON training_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;

-- Training modules: Users can see assigned modules or all if admin
CREATE POLICY "training_modules_select"
  ON training_modules FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    EXISTS (
      SELECT 1 FROM training_assignments ta
      WHERE ta.training_module_id = training_modules.id
      AND (
        ta.assigned_to_user_id = auth.uid() OR
        ta.assigned_to_all = true OR
        (ta.assigned_to_property_id IS NOT NULL AND
         public.has_property_access(auth.uid(), ta.assigned_to_property_id)) OR
        (ta.assigned_to_department_id IS NOT NULL AND
         EXISTS (
           SELECT 1 FROM user_departments ud
           WHERE ud.user_id = auth.uid() AND ud.department_id = ta.assigned_to_department_id
         ))
      )
    )
  );

-- Training content blocks: Same as modules
CREATE POLICY "training_content_blocks_select"
  ON training_content_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = training_content_blocks.training_module_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        EXISTS (
          SELECT 1 FROM training_assignments ta
          WHERE ta.training_module_id = tm.id
          AND (
            ta.assigned_to_user_id = auth.uid() OR
            ta.assigned_to_all = true OR
            (ta.assigned_to_property_id IS NOT NULL AND
             public.has_property_access(auth.uid(), ta.assigned_to_property_id))
          )
        )
      )
    )
  );

-- Training quizzes: Same as modules
CREATE POLICY "training_quizzes_select"
  ON training_quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = training_quizzes.training_module_id
      AND (
        public.has_role(auth.uid(), 'regional_admin') OR
        EXISTS (
          SELECT 1 FROM training_assignments ta
          WHERE ta.training_module_id = tm.id
          AND (
            ta.assigned_to_user_id = auth.uid() OR
            ta.assigned_to_all = true OR
            (ta.assigned_to_property_id IS NOT NULL AND
             public.has_property_access(auth.uid(), ta.assigned_to_property_id))
          )
        )
      )
    )
  );

-- Training assignments: Users can see their assignments
CREATE POLICY "training_assignments_select"
  ON training_assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'regional_admin') OR
    public.has_role(auth.uid(), 'property_manager') OR
    public.has_role(auth.uid(), 'department_head') OR
    assigned_to_user_id = auth.uid() OR
    assigned_to_all = true OR
    (assigned_to_property_id IS NOT NULL AND
     public.has_property_access(auth.uid(), assigned_to_property_id)) OR
    (assigned_to_department_id IS NOT NULL AND
     EXISTS (
       SELECT 1 FROM user_departments ud
       WHERE ud.user_id = auth.uid() AND ud.department_id = assigned_to_department_id
     ))
  );

-- Training progress: Users can see their own progress
CREATE POLICY "training_progress_select"
  ON training_progress FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'regional_admin') OR
    (public.has_role(auth.uid(), 'property_manager') AND
     EXISTS (
       SELECT 1 FROM user_properties up
       JOIN profiles p ON up.user_id = p.id
       WHERE p.id = training_progress.user_id AND up.property_id IN (
         SELECT property_id FROM user_properties WHERE user_id = auth.uid()
       )
     )) OR
    (public.has_role(auth.uid(), 'department_head') AND
     EXISTS (
       SELECT 1 FROM user_departments ud
       WHERE ud.user_id = training_progress.user_id AND ud.department_id IN (
         SELECT department_id FROM user_departments WHERE user_id = auth.uid()
       )
     ))
  );

