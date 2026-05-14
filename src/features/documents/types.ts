export type DocumentItem = {
  id: string
  title: string
  file_path: string
  file_type: 'pdf' | 'ppt' | 'pptx'
  uploaded_at: string
}

export type DocumentListResponse = {
  documents: DocumentItem[]
}
