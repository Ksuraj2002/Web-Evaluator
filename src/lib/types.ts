export type Role = 'student' | 'admin'

export interface Profile {
  id: string
  email: string
  role: Role
}

export type FileMap = Record<string, string>

export interface Project {
  id: string
  title: string
  description: string
  starter_files: FileMap
  created_at: string
}

export interface ProjectAsset {
  id: string
  project_id: string
  name: string
  storage_path: string
  public_url: string
  content_type: string | null
  size_bytes: number | null
}

export interface Assignment {
  id: string
  project_id: string
  assignee_email: string
  starts_at: string
  ends_at: string
  created_at: string
}

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  files: FileMap
  submitted_at: string
}
