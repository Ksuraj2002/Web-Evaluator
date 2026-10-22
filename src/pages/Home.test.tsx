import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Assignment } from '../lib/types'

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('../lib/auth', () => ({
  useAuth: vi.fn(),
}))

const assignment = (id: string, startsAt: string, endsAt: string): Assignment & {
  project: { title: string; description: string }
} => ({
  id,
  project_id: `project-${id}`,
  assignee_email: 'student@example.com',
  is_public: false,
  starts_at: startsAt,
  ends_at: endsAt,
  created_at: '2025-01-01T00:00:00.000Z',
  project: { title: `Project ${id}`, description: '' },
})

function renderHome() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home assignments', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      session: null,
      profile: { id: 'student-1', email: 'student@example.com', role: 'student' },
      loading: false,
      signOut: vi.fn(),
    })

    const now = Date.now()
    const assignments = [
      assignment('open', new Date(now - 60_000).toISOString(), new Date(now + 60_000).toISOString()),
      assignment('upcoming', new Date(now + 60_000).toISOString(), new Date(now + 120_000).toISOString()),
      assignment('closed', new Date(now - 120_000).toISOString(), new Date(now - 60_000).toISOString()),
      assignment('closed-unsubmitted', new Date(now - 120_000).toISOString(), new Date(now - 60_000).toISOString()),
    ]
    const submissions = [{ assignment_id: 'closed', submitted_at: new Date(now - 90_000).toISOString() }]

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'assignments') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: assignments }),
          }),
        } as never
      }
      return {
        select: vi.fn().mockResolvedValue({ data: submissions }),
      } as never
    })
  })

  it('shows the correct action for open, upcoming, and submitted assignments', async () => {
    renderHome()

    expect(await screen.findByRole('link', { name: 'Open' })).toHaveAttribute('href', '/solve/open')
    expect(screen.getByText('Not yet open')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Your assignments')).toBeInTheDocument())
  })

  it('shows an empty state when there are no assignments', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'assignments') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [] }),
          }),
        } as never
      }
      return { select: vi.fn().mockResolvedValue({ data: [] }) } as never
    })

    renderHome()

    expect(await screen.findByText('Nothing assigned yet.')).toBeInTheDocument()
  })
})
