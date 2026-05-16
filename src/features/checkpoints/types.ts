export type Checkpoint = {
  id: string
  user_id: string
  document_id: string
  session_id: string | null
  page_number: number | null
  content: string
  created_at: string
}

export type CheckpointCreate = {
  document_id: string
  session_id?: string | null
  page_number: number | null
  content: string
}
