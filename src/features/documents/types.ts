export type DocumentItem = {
  id: string
  title: string
  file_path: string
  viewer_pdf_url: string
  file_type: 'pdf' | 'ppt' | 'pptx'
  uploaded_at: string
}

export type DocumentListResponse = {
  documents: DocumentItem[]
}

export type DocumentPage = {
  document_id: string
  page_number: number
  image_url: string
  text: string
}

export type DocumentPageListResponse = {
  pages: DocumentPage[]
}
