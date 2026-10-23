// Groups file paths by folder for the file trees: root files first, then
// folders alphabetically; files keep their order within a folder.
// `extraFolders` adds folders that have no files yet.
export function groupByFolder(names: string[], extraFolders: string[] = []): [string, string[]][] {
  const g = new Map<string, string[]>()
  for (const name of names) {
    const i = name.lastIndexOf('/')
    const dir = i === -1 ? '' : name.slice(0, i)
    if (!g.has(dir)) g.set(dir, [])
    g.get(dir)!.push(name)
  }
  for (const f of extraFolders) if (!g.has(f)) g.set(f, [])
  return Array.from(g.entries()).sort((a, b) =>
    a[0] === '' ? -1 : b[0] === '' ? 1 : a[0].localeCompare(b[0])
  )
}
