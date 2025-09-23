export interface User {
  id: string
  email: string
  full_name?: string
  role: "student" | "teacher" | "admin"
  created_at: string
  updated_at: string
}

export interface Quiz {
  id: string
  title: string
  description?: string
  teacher_id: string
  time_limit?: number
  max_attempts: number
  shuffle_questions: boolean
  shuffle_options: boolean
  show_results: boolean
  anti_cheating_enabled: boolean
  webcam_required: boolean
  fullscreen_required: boolean
  tab_switching_allowed: boolean
  copy_paste_allowed: boolean
  right_click_allowed: boolean
  is_published: boolean
  created_at: string
  updated_at: string
  questions?: Question[]
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "short_answer"
  points: number
  order_index: number
  created_at: string
  options?: QuestionOption[]
}

export interface QuestionOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order_index: number
  created_at: string
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  started_at: string
  completed_at?: string
  score?: number
  total_points?: number
  time_taken?: number
  attempt_number: number
  is_flagged: boolean
  cheating_incidents: any[]
  created_at: string
}

export interface StudentAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id?: string
  text_answer?: string
  is_correct?: boolean
  points_earned: number
  answered_at: string
}

export interface CheatingLog {
  id: string
  attempt_id: string
  incident_type: "tab_switch" | "window_blur" | "copy_paste" | "right_click" | "fullscreen_exit" | "webcam_lost"
  incident_data?: any
  timestamp: string
}
