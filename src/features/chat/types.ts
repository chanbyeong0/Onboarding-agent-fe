export type ChatRequest = {
  message: string
  session_id?: string | null
  document_id?: string | null
  page_number: number | null
  mode?: 'question' | 'explain_page'
  checkpoints: string[]
}

export type ChatResponse = {
  answer: string
}
