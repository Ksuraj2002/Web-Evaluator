import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Preview from './Preview'
import type { ProjectAsset } from '../lib/types'

const assets: ProjectAsset[] = [{
  id: 'asset-1',
  project_id: 'project-1',
  name: 'images/logo.png',
  storage_path: 'project-1/images/logo.png',
  public_url: 'https://assets.example/logo.png',
  content_type: 'image/png',
  size_bytes: 100,
}]

describe('Preview', () => {
  it('inlines linked project files and resolves asset URLs', async () => {
    render(
      <Preview
        files={{
          'index.html': '<link rel="stylesheet" href="styles.css"><script src="script.js"></script><img src="images/logo.png">',
          'styles.css': 'body { color: red; }',
          'script.js': 'window.ready = true;',
        }}
        assets={assets}
      />,
    )

    const iframe = screen.getByTitle('preview') as HTMLIFrameElement
    await waitFor(() => expect(iframe.srcdoc).toContain('body { color: red; }'))

    expect(iframe.srcdoc).toContain('<script data-src="script.js">window.ready = true;</script>')
    expect(iframe.srcdoc).toContain('src="https://assets.example/logo.png"')
  })

  it('keeps the preview sandboxed and appends default files when not linked', async () => {
    render(
      <Preview
        files={{
          'index.html': '<main>Work</main>',
          'styles.css': 'main { color: blue; }',
          'script.js': 'window.loaded = true;',
        }}
        assets={[]}
      />,
    )

    const iframe = screen.getByTitle('preview') as HTMLIFrameElement
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin')
    await waitFor(() => expect(iframe.srcdoc).toContain('<style>main { color: blue; }</style>'))
    expect(iframe.srcdoc).toContain('<script>window.loaded = true;</script>')
  })
})
