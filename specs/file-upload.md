# File Upload Spec — Document Attachment and Parsing

## Feature Name
File Upload — PDF and DOCX parsing with document preview

---

## Description

Users attach a PDF or DOCX contract file via the chat composer. The file is parsed
**client-side** into plain text using `pdfjs-dist` (PDF) or `mammoth` (DOCX). The raw file
is never sent to any server — only the extracted text is transmitted to `/api/chat`. The
parsed text and a blob URL (for PDF preview) are stored in component state on the parent
chat page. Files are session-only; they are not persisted to any database.

---

## User Flow

1. User clicks the `Paperclip` icon in the chat composer
2. File picker opens — accepts `.pdf` and `.docx` only
3. User selects a file
4. Client validates: type (PDF or DOCX only) and size (max 10 MB)
5. If invalid: show inline error in the composer, no further action
6. If valid: parse the file client-side (see Parsing Strategy below)
7. A file chip appears above the composer textarea: `FileText` icon + truncated filename + `X` dismiss
8. Right panel updates: shows document preview (PDF iframe / DOCX text)
9. User types a question and sends — `contractText` is included in the request body
10. File chip persists while chatting — not cleared on message send
11. User can dismiss the chip (X button) to remove the file — right panel clears, `contractText = ''`

---

## How Content Reaches the Backend

Extracted text is sent as a JSON string field:
```json
{ "contractText": "full extracted text...", "userMessage": "...", "sessionId": "..." }
```

- Field name: `contractText`
- Max length: 80,000 characters (truncated client-side if exceeded, with console warning)
- When no file attached: `contractText` is empty string `""`

The raw file is **never uploaded** to any server. No `multipart/form-data`.

---

## Parsing Strategy

All parsing happens **client-side** in the browser.

### PDF — `pdfjs-dist` v4

- **Library:** `pdfjs-dist`
- **Worker setup:** `GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'`
  - Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` → `public/pdf.worker.min.mjs` at build time
- **Method:** Load PDF with `pdfjsLib.getDocument({ data: arrayBuffer })`, iterate pages, call `page.getTextContent()`, join `item.str` values with spaces
- **Scanned PDF detection:** If total extracted text length is < 100 chars across all pages → block with error
- **Font warnings in console:** harmless — text extraction works regardless

**Setup in `next.config.mjs`:**
```js
experimental: {
  serverComponentsExternalPackages: ['pdfjs-dist']
}
```

### DOCX — `mammoth`

- **Library:** `mammoth`
- **Method:** `mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })`
- **Returns:** `{ value: string }` — plain text, no HTML
- No worker setup required — works in browser without configuration

---

## Content Preview

### PDF Preview

1. Before parsing: `const blobUrl = URL.createObjectURL(file)`
2. Pass `blobUrl` to `onFileLoaded` alongside extracted text
3. Display in right panel as `<iframe src={blobUrl} width="100%" height="100%" />`
4. Controls overlay (top of right panel):
   - Page count label: "Page X of Y" (read from `pdfDocument.numPages`)
   - Zoom: fit-width button only in MVP (full zoom controls in v1.1)
   - Download: `<a href={blobUrl} download={filename}>` button
5. On file dismiss: `URL.revokeObjectURL(blobUrl)` to free memory

### DOCX Preview

1. No blob URL — preview is the extracted text
2. Display in right panel as:
```html
<pre class="font-mono text-xs text-an-fg-subtle overflow-y-auto p-4">
  {contractText.slice(0, 4000)}
  {contractText.length > 4000 ? '\n\n… (preview truncated at 4,000 characters)' : ''}
</pre>
```
3. Scrollable, monospace font (JetBrains Mono), max-height fills right panel

### Where the Preview Lives

- Right panel (`components/RightPanel.tsx`), upper section
- Takes approximately 60% of the right panel height (flex-based)
- Persists while the user is chatting — not cleared on message send
- Cleared when user dismisses the file chip or switches sessions

---

## State Architecture

`FileUpload.tsx` owns **no state**. It fires a callback and is done.

State lives in `app/chat/page.tsx`:

| State | Type | Set by |
|---|---|---|
| `contractText` | `string` | `onFileLoaded` callback |
| `filename` | `string` | `onFileLoaded` callback |
| `previewUrl` | `string` | `onFileLoaded` callback (`''` for DOCX) |
| `fileType` | `'pdf' \| 'docx' \| ''` | `onFileLoaded` callback |

**Callback signature:**
```typescript
onFileLoaded(text: string, filename: string, previewUrl: string, fileType: 'pdf' | 'docx'): void
```

**On file dismiss (X button):**
```typescript
// In chat page:
if (previewUrl) URL.revokeObjectURL(previewUrl)
setContractText('')
setFilename('')
setPreviewUrl('')
setFileType('')
```

---

## `FileUpload.tsx` Component

**Props:**
```typescript
{
  onFileLoaded: (text: string, filename: string, previewUrl: string, fileType: 'pdf' | 'docx') => void
  filename: string  // '' when no file attached; used to show/hide the chip
  onDismiss: () => void
}
```

**Behaviour:**
- Hidden `<input type="file" accept=".pdf,.docx" />`
- `Paperclip` icon button triggers `input.click()`
- On file select: validate → parse → call `onFileLoaded`
- While parsing: show `Loader` spinner inside the chip area (replace icon)
- On parse error: show inline error, clear file, call `onDismiss`

---

## API Contract

The file content is sent to `POST /api/chat`:

| Field | Type | Notes |
|---|---|---|
| `contractText` | `string` | Extracted text, max 80,000 chars |
| `userMessage` | `string` | The user's question |
| `sessionId` | `string` | Active session UUID |

When `contractText === ''`: Azure still receives the question — it answers from general
knowledge, constrained by the system prompt to say "I cannot find this in the document."

---

## Validation

| Check | Error message shown | Where |
|---|---|---|
| File type not PDF or DOCX | "Only PDF and DOCX files are supported." | Inline in composer |
| File size > 10 MB | "File exceeds the 10 MB limit." | Inline in composer |
| Scanned PDF (< 100 chars extracted) | "This PDF appears to be scanned. Please upload a text-based PDF." | Inline in composer |
| DOCX parse failure | "Could not read this DOCX file. Please try a different file." | Inline in composer |
| PDF parse failure (corrupted) | "Could not read this PDF file. Please try a different file." | Inline in composer |

Errors appear below the composer container in `text-an-error`, 12px. They do not block
the user from chatting without a file.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| User attaches a second file | Revoke previous `blobUrl` first; replace all file state with new file |
| User dismisses file mid-parse | Cancel ongoing parse; call `onDismiss` immediately |
| Extracted text > 80,000 chars | Truncate at 80,000 chars; log console warning; no user-facing message |
| Empty DOCX (no text content) | `mammoth` returns `value: ''`; treat as parse failure; show error |
| Protected/encrypted PDF | `pdfjs-dist` throws; catch and show parse failure error |
| User switches sessions with file attached | `previewUrl` revoked, file state cleared in parent |
| Parse takes > 5s (large PDF) | Show `Loader` spinner in chip; no timeout — let it complete |
