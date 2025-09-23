-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  time_limit INTEGER, -- in minutes
  max_attempts INTEGER DEFAULT 1,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  show_results BOOLEAN DEFAULT TRUE,
  anti_cheating_enabled BOOLEAN DEFAULT TRUE,
  webcam_required BOOLEAN DEFAULT FALSE,
  fullscreen_required BOOLEAN DEFAULT TRUE,
  tab_switching_allowed BOOLEAN DEFAULT FALSE,
  copy_paste_allowed BOOLEAN DEFAULT FALSE,
  right_click_allowed BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_options table (for multiple choice questions)
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score DECIMAL(5,2),
  total_points INTEGER,
  time_taken INTEGER, -- in seconds
  attempt_number INTEGER DEFAULT 1,
  is_flagged BOOLEAN DEFAULT FALSE,
  cheating_incidents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_answers table
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.question_options(id),
  text_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2) DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cheating_logs table
CREATE TABLE IF NOT EXISTS public.cheating_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('tab_switch', 'window_blur', 'copy_paste', 'right_click', 'fullscreen_exit', 'webcam_lost')),
  incident_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheating_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for quizzes table
CREATE POLICY "Teachers can manage their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Students can view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true);

-- RLS Policies for questions table
CREATE POLICY "Teachers can manage questions for their quizzes" ON public.questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = auth.uid())
);
CREATE POLICY "Students can view questions for published quizzes" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.is_published = true)
);

-- RLS Policies for question_options table
CREATE POLICY "Teachers can manage options for their quiz questions" ON public.question_options FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.questions 
    JOIN public.quizzes ON questions.quiz_id = quizzes.id 
    WHERE questions.id = question_options.question_id AND quizzes.teacher_id = auth.uid()
  )
);
CREATE POLICY "Students can view options for published quiz questions" ON public.question_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.questions 
    JOIN public.quizzes ON questions.quiz_id = quizzes.id 
    WHERE questions.id = question_options.question_id AND quizzes.is_published = true
  )
);

-- RLS Policies for quiz_attempts table
CREATE POLICY "Students can manage their own attempts" ON public.quiz_attempts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view attempts for their quizzes" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_attempts.quiz_id AND quizzes.teacher_id = auth.uid())
);

-- RLS Policies for student_answers table
CREATE POLICY "Students can manage their own answers" ON public.student_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = student_answers.attempt_id AND quiz_attempts.student_id = auth.uid())
);
CREATE POLICY "Teachers can view answers for their quiz attempts" ON public.student_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts 
    JOIN public.quizzes ON quiz_attempts.quiz_id = quizzes.id 
    WHERE quiz_attempts.id = student_answers.attempt_id AND quizzes.teacher_id = auth.uid()
  )
);

-- RLS Policies for cheating_logs table
CREATE POLICY "Students can view their own cheating logs" ON public.cheating_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = cheating_logs.attempt_id AND quiz_attempts.student_id = auth.uid())
);
CREATE POLICY "Teachers can view cheating logs for their quiz attempts" ON public.cheating_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts 
    JOIN public.quizzes ON quiz_attempts.quiz_id = quizzes.id 
    WHERE quiz_attempts.id = cheating_logs.attempt_id AND quizzes.teacher_id = auth.uid()
  )
);
CREATE POLICY "System can insert cheating logs" ON public.cheating_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = cheating_logs.attempt_id)
);
