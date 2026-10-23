# Safe Exam Browser config

`web-eval-exam.seb` starts SEB on https://web-evaluator.vercel.app/ and blocks
every site except the ones the platform needs. It's an unencrypted settings
file with **no quit password**, so finish it before handing it out.

## Before the exam

1. **Add a quit password.** Open the file in the SEB Config Tool (Windows) or
   SEB → Settings (macOS), go to *General*, set *Quit/unlock password*, then
   save it, encrypted with a settings password if you like. Without one,
   students can quit SEB whenever they want.
2. **Have students sign up before the exam, outside SEB**, with the exact
   email they were assigned. The confirmation email can't be opened inside SEB.
3. **Do a dry run** on one exam-room machine with this file:
   - [ ] the login page loads and you can sign in
   - [ ] the editor shows code with syntax colours (Monaco)
   - [ ] a React assignment's preview shows the app within ~15 s
   - [ ] typing updates the preview; the header shows "✓ Saved"
   - [ ] Submit works
   - [ ] "Show expected output" / asset ↗ links open in a separate SEB window

## What's allowed (everything else is blocked)

| Rule | Why |
|---|---|
| `web-evaluator.vercel.app` | the app |
| `ymsbimnikmvocomskuvm.supabase.co` | login, data, autosave, asset images |
| `cdn.jsdelivr.net/npm/*` | code editor (Monaco) and npm files for the React preview. `/gh/` (GitHub files) stays blocked |
| `.data.jsdelivr.com` | npm version lookups for the React preview |
| `.2-19-8-sandpack.codesandbox.io` | React preview bundler (exact host) |
| `.prod-packager-packages.codesandbox.io` | pre-built React packages (exact host) |
| `.aiwi8rnkp5.execute-api.eu-west-1.amazonaws.com` | CodeSandbox's fallback package builder (exact host) |

`codesandbox.io` itself, `unpkg.com` and GitHub stay blocked on purpose:
student code runs inside the preview, so any allowed site could be opened
there (an online IDE or a GitHub file with a prepared solution).

## If the dry run shows a problem

- **React preview stuck on "Downloading dependencies" or shows a fetch
  error:** add an *allow* rule for `unpkg.com` (the bundler's fallback CDN) and
  try again. As a last resort, `codesandbox.io` (all of it), but read the
  note above first.
- **Blank editor:** check the `cdn.jsdelivr.net/npm/*` rule is active.
- **After upgrading `@codesandbox/sandpack-react`:** the bundler host follows
  its version (`2-19-8` = sandpack-client 2.19.8). Check
  `node_modules/@codesandbox/sandpack-client/package.json` and update the rule.

## Other settings

Reload allowed (handy if the preview hangs), back/forward off, developer
console off, spell check off, downloads and printing off, one display, no
virtual machines, cookies cleared at start and end (students sign in each
session; their work is still on the server). Links that open a new tab open
in a new SEB window.
