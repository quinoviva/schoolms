export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export function getDriveThumbnail(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w200-h200`
}

export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`
}

export function getDriveIcon(mimeType?: string): string {
  if (!mimeType) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png'
  if (mimeType.includes('pdf')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_12_pdf_list.png'
  if (mimeType.includes('document')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_document_list.png'
  if (mimeType.includes('spreadsheet')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_spreadsheet_list.png'
  if (mimeType.includes('presentation')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_presentation_list.png'
  if (mimeType.includes('folder')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_folder_list.png'
  if (mimeType.includes('image')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_image_list.png'
  if (mimeType.includes('video')) return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_video_list.png'
  return 'https://ssl.gstatic.com/docs/doclist/images/icon_11_generic_list.png'
}

export const DRIVE_FILE_TYPES = [
  { value: '', label: 'Auto-detect' },
  { value: 'application/pdf', label: 'PDF' },
  { value: 'application/vnd.google-apps.document', label: 'Google Doc' },
  { value: 'application/vnd.google-apps.spreadsheet', label: 'Google Sheet' },
  { value: 'application/vnd.google-apps.presentation', label: 'Google Slides' },
  { value: 'application/vnd.google-apps.folder', label: 'Google Drive Folder' },
  { value: 'image/*', label: 'Image' },
  { value: 'video/*', label: 'Video' },
]

export async function fetchDriveFileName(fileId: string, apiKey?: string): Promise<string | null> {
  if (!apiKey) return null
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?key=${apiKey}&fields=name,mimeType`)
    if (!res.ok) return null
    const data = await res.json()
    return data.name || null
  } catch {
    return null
  }
}
