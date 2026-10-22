import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Markdown from './Markdown'

describe('Markdown', () => {
  it('renders markdown formatting', () => {
    render(<Markdown source={'# Assignment\n\n**Important** details'} />)

    expect(screen.getByRole('heading', { name: 'Assignment' })).toBeInTheDocument()
    expect(screen.getByText('Important').tagName).toBe('STRONG')
  })

  it('removes executable markup from untrusted markdown', () => {
    const { container } = render(
      <Markdown source={'<img src="x" onerror="alert(1)"><script>alert(1)</script>'} />,
    )

    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', 'x')
    expect(container.querySelector('img')).not.toHaveAttribute('onerror')
  })
})
