import { useEffect, useMemo, useRef } from 'react'
import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from '@codesandbox/sandpack-react'
import type { FileMap, ProjectAsset } from '../lib/types'

/**
 * Live preview for React projects — Monaco stays as the editor, Sandpack is
 * used headlessly as a browser-side bundler + preview iframe.
 *
 * Student files are mapped into Sandpack's virtual FS. Any file the student
 * hasn't created (entrypoint, index.html, package.json) is auto-filled by the
 * Sandpack "react" template, so a bare `App.jsx` works out of the box.
 */
export default function ReactPreview({
  files,
  assets,
}: {
  files: FileMap
  assets: ProjectAsset[]
}) {
  // Sandpack wants leading-slash paths. Also replace any asset-path references
  // in CSS/JS with their public URL so students can `import logo from 'images/logo.png'`.
  const { sandpackFiles, entry } = useMemo(() => {
    const assetMap = new Map(assets.map(a => [a.name, a.public_url]))
    const out: Record<string, string> = {}
    for (const [name, code] of Object.entries(files)) {
      let body = code
      // Rewrite "images/..." → public URL in common import/attr spots.
      if (assetMap.size && /\.(jsx?|tsx?|css|html)$/i.test(name)) {
        body = body.replace(/(["'`])([^"'`\s]+?)\1/g, (m, q, val) => {
          const u = assetMap.get(val)
          return u ? `${q}${u}${q}` : m
        })
      }
      // Two silent rewrites so the student's exam-compliant code renders in
      // Sandpack without them having to change a line:
      //   1. `from 'react-router'`  →  `from 'react-router-dom'`
      //      v7 of react-router doesn't bundle inside Sandpack's in-browser
      //      resolver, and v6's `react-router` package omits BrowserRouter.
      //      v6's `react-router-dom` has every symbol the spec uses.
      //   2. `BrowserRouter`         →  `HashRouter`
      //      Sandpack's preview iframe isn't served at `/`, so BrowserRouter
      //      (which reads window.location.pathname) matches nothing and
      //      renders blank. HashRouter uses the URL fragment and works in any
      //      hosting context.
      if (/\.(jsx?|tsx?)$/i.test(name)) {
        body = body
          .replace(/(from\s*['"])react-router(['"])/g, '$1react-router-dom$2')
          .replace(/\bBrowserRouter\b/g, 'HashRouter')
      }
      out['/' + name.replace(/^\/+/, '')] = body
    }

    // Entry resolution: Sandpack's `react` template defaults the entry to
    // /index.js regardless of what the student's package.json says. We detect
    // the project's actual entry file in priority order and tell Sandpack
    // explicitly via customSetup.entry. If the project is bare (no entry at
    // all), fall back to seeding /index.js with a minimal bootstrapper.
    const entryCandidates = [
      '/src/main.jsx', '/src/main.tsx', '/src/main.js', '/src/main.ts',
      '/src/index.jsx', '/src/index.tsx', '/src/index.js', '/src/index.ts',
      '/main.jsx', '/main.js',
      '/index.jsx', '/index.tsx', '/index.js', '/index.ts',
    ]
    let entry = entryCandidates.find(p => out[p])
    if (!entry) {
      out['/index.js'] = defaultEntry(out)
      entry = '/index.js'
    }
    return { sandpackFiles: out, entry }
  }, [files, assets])

  // Must keep a stable identity: Sandpack re-derives its whole file state
  // whenever `customSetup` changes, and Solve re-renders every second for
  // the countdown timer.
  const customSetup = useMemo(() => ({
    entry,
    dependencies: {
      // v6 bundles reliably in Sandpack. The `react-router` →
      // `react-router-dom` rewrite above makes the exam-spec import
      // syntax resolve here. React Router v7's ESM-only tree doesn't
      // bundle inside Sandpack's in-browser resolver.
      'react-router-dom': '^6.26.0',
    },
  }), [entry])

  return (
    <SandpackProvider
      key={JSON.stringify(Object.keys(sandpackFiles).sort())}
      template="react"
      files={sandpackFiles}
      customSetup={customSetup}
      options={SANDPACK_OPTIONS}
      style={{ width: '100%', height: '100%' }}
    >
      <StartWhenMounted />
      <div className="w-full h-full flex flex-col bg-white">
        <div className="flex-1 min-h-0 relative">
          <SandpackPreview
            showNavigator
            showRefreshButton
            showOpenInCodeSandbox={false}
            style={{ height: '100%', width: '100%', border: 'none' }}
          />
        </div>
        <div className="shrink-0 h-32 border-t border-vs-border">
          <SandpackConsole
            style={{ height: '100%', background: '#1e1e1e' }}
            showHeader={false}
            resetOnPreviewRestart
          />
        </div>
      </div>
    </SandpackProvider>
  )
}

/**
 * Starts the bundler once the provider tree has finished mounting.
 *
 * With Sandpack's own autorun, React StrictMode's dev-only
 * mount → unmount → mount cycle races Sandpack's async client creation
 * against its cleanup (which blanks the iframe with about:blank). The
 * bundler still runs — console output arrives — but the visible iframe
 * stays white. Deferring the start by a tick lets the simulated unmount
 * cancel the first timer, so the bundler starts exactly once.
 *
 * Runs once per mount only: `runSandpack` changes identity whenever the
 * files change, and re-running it would tear down and recreate the client
 * on every keystroke. Later edits reach the bundler through Sandpack's own
 * file watcher.
 */
function StartWhenMounted() {
  const { sandpack } = useSandpack()
  const run = useRef(sandpack.runSandpack)
  run.current = sandpack.runSandpack
  useEffect(() => {
    const t = window.setTimeout(() => { void run.current() }, 0)
    return () => window.clearTimeout(t)
  }, [])
  return null
}

const SANDPACK_OPTIONS = {
  // Started by <StartWhenMounted> instead — see the note there.
  autorun: false,
  recompileMode: 'delayed',
  recompileDelay: 400,
} as const

/**
 * Bootstrapper for bare projects. Imports the student's App by its exact
 * filename: a bare `./App` would resolve to the Sandpack template's hidden
 * /App.js ("Hello world") before the student's /App.jsx.
 */
function defaultEntry(files: Record<string, string>): string {
  const app = ['/App.jsx', '/App.tsx', '/App.js', '/App.ts'].find(p => p in files) ?? '/App.js'
  const css = '/styles.css' in files ? `import "./styles.css"\n` : ''
  return `import React from "react"
import { createRoot } from "react-dom/client"
${css}import App from ".${app}"

const el = document.getElementById("root")
if (el) createRoot(el).render(<App />)
`
}
