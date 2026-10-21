export type Role = 'student' | 'admin'

export type Campus = 'Hi-Tech' | 'RGIB' | 'JU' | 'Dummy'
export const CAMPUSES: Campus[] = ['Hi-Tech', 'RGIB', 'JU', 'Dummy']

export const SECTIONS = ['A', 'B', 'C', 'D', 'Dummy'] as const
export const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8', 'Dummy'] as const

export interface Profile {
  id: string
  email: string
  role: Role
  full_name?: string | null
  campus?: Campus | null
  semester?: string | null
  section?: string | null
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
  assignee_email: string | null
  is_public: boolean
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
