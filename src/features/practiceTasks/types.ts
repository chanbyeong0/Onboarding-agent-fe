export type PracticeTaskStatus = 'draft' | 'approved'

export type PracticeTask = {
  id: string
  session_id: string
  document_id: string
  page_number: number
  title: string
  instruction: string | null
  command: string
  expected_output: string | null
  hint: string | null
  safety_note: string | null
  status: PracticeTaskStatus
  created_at: string
  updated_at: string
}

export type PracticeTaskListResponse = {
  tasks: PracticeTask[]
}

export type PracticeTaskCreateRequest = {
  document_id: string
  page_number: number
  title: string
  instruction?: string | null
  command: string
  expected_output?: string | null
  hint?: string | null
  safety_note?: string | null
  status: PracticeTaskStatus
}

export type PracticeTaskAssistRequest = {
  document_id: string
  page_number: number
  command: string
}

export type PracticeTaskAssistResponse = {
  title: string
  instruction: string
  expected_output: string
  hint: string
  safety_note: string
}
