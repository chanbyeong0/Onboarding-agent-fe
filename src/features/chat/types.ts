export type ChatRequest = {
  message: string
  document_id: string
  page_number: number | null
  checkpoints: string[]
}

export type ChatStreamEvent =
  | {
      type: 'delta'
      text: string
    }
  | {
      type: 'done'
    }
  | {
      type: 'error'
      error: string
    }
