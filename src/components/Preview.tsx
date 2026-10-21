import { memo, useEffect, useRef } from 'react'
import type { FileMap, ProjectAsset } from '../lib/types'

/**
 * Live preview: builds an iframe srcdoc from the file map.
 * - index.html is used as-is
 * - inline references to styles.css / script.js are rewritten to data URLs
 * - asset library files are exposed via <base> + resolved public URLs
 */
function Preview({ files, assets }: { files: FileMap; assets: ProjectAsset[] }) {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const html = files['index.html'] ?? ''
    const assetMap = new Map(assets.map(a => [a.name, a.public_url]))

    // Normalize an href/src value against a base path (the referrer file's dir)
    const normalize = (val: string, baseDir = ''): string => {
      let v = val.trim().replace(/^\.\//, '')
      if (v.startsWith('/')) v = v.slice(1)
      else if (baseDir) v = `${baseDir}/${v}`
      // Resolve ".." / "." segments
      const parts: string[] = []
      for (const seg of v.split('/')) {
        if (seg === '' || seg === '.') continue
        if (seg === '..') parts.pop()
        else parts.push(seg)
      }
      return parts.join('/')
    }

    // Inline any <link href="X.css"> or <script src="X.js"> whose target is in `files`;
    // for other src/href values, swap in asset-library URLs if the path matches.
    let doc = html
      .replace(
        /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi,
        (m, href) => {
          const key = normalize(href)
          if (files[key] != null) return `<style data-src="${key}">${files[key]}</style>`
          const url = assetMap.get(key)
          return url ? m.replace(href, url) : m
        }
      )
      .replace(
        /<script[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi,
        (m, src) => {
          const key = normalize(src)
          if (files[key] != null) return `<script data-src="${key}">${files[key]}<\/script>`
          const url = assetMap.get(key)
          return url ? m.replace(src, url) : m
        }
      )
      .replace(/(src|href)=["']([^"']+)["']/gi, (m, attr, val) => {
        const key = normalize(val)
        const u = assetMap.get(key)
        return u ? `${attr}="${u}"` : m
      })

    // Fallback: append root styles.css / script.js if user didn't link them
    const rootCss = files['styles.css']
    const rootJs = files['script.js']
    if (rootCss && !new RegExp(`data-src="styles\\.css"`).test(doc)) doc += `\n<style>${rootCss}</style>`
    if (rootJs  && !new RegExp(`data-src="script\\.js"`).test(doc))  doc += `\n<script>${rootJs}<\/script>`

    const iframe = ref.current
    if (!iframe) return
    iframe.srcdoc = doc
  }, [files, assets])

  return (
    <iframe
      ref={ref}
      title="preview"
      sandbox="allow-scripts allow-forms allow-same-origin"
      className="w-full h-full bg-white"
    />
  )
}

export default memo(Preview)
