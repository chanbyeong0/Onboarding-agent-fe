export type ExamQuestion = {
  question: string
  options: string[]
  correct_option_index: number | null
  explanation: string | null
  source_hint: string | null
}

export type ExamAnswerResult = {
  question_index: number
  selected_option_index: number
  correct_option_index: number
  is_correct: boolean
}

export type ExamAttempt = {
  id: string
  session_id: string
  user_id: string
  questions: ExamQuestion[]
  answers: ExamAnswerResult[]
  score: number | null
  created_at: string
  submitted_at: string | null
}

export type ExamSubmitRequest = {
  answers: {
    question_index: number
    selected_option_index: number
  }[]
}
