import type { DocumentItem } from '../documents/types'

export type LectureSession = {
  id: string
  title: string
  description: string | null
  document_ids: string[]
  documents: DocumentItem[]
  created_by: string
  created_at: string
}

export type LectureSessionCreate = {
  title: string
  description?: string | null
  document_ids: string[]
}

export type LectureSessionListResponse = {
  sessions: LectureSession[]
}

export type LearningSummary = {
  total_documents: number
  completed_documents: number
  completion_rate: number
  checkpoint_count: number
  question_count: number
  sessions: LectureSession[]
}

export type PageExplanationRequest = {
  document_id: string
  page_number: number
  checkpoints: string[]
}

export type PageExplanation = {
  text: string
  audio_url: string | null
}
