import type { DocumentItem } from '../documents/types'

export type LectureSession = {
  id: string
  title: string
  description: string | null
  category: string
  level: string
  document_ids: string[]
  documents: DocumentItem[]
  created_by: string
  created_at: string
  progress: SessionProgress | null
}

export type SessionProgress = {
  completed_pages: number
  total_pages: number
  progress_rate: number
  study_seconds: number
  last_document_id: string | null
  last_page_number: number | null
  completed_at: string | null
}

export type LectureSessionCreate = {
  title: string
  description?: string | null
  category: string
  level: string
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
  study_seconds: number
  sessions: LectureSession[]
}

export type ProgressUpdateRequest = {
  document_id: string
  page_number: number
  total_pages: number
  study_seconds_delta?: number
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
