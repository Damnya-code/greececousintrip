# Travel Log editor guide

The Travel Log editor is a local browser tool for building a day without editing code. It saves work in the current browser and exports files for later publishing.

Local saving is convenient, not a backup. Export JSON regularly. Photographs are never uploaded by the editor.

## Open the editor

From the repository folder, start the normal local server:

```powershell
py -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500/editor/index.html
```

The editor is deliberately absent from the public website navigation. Its `noindex` setting discourages search indexing, but it is not access control. Anything committed to a public repository remains publicly requestable.

## Start an entry

1. Choose a trip day.
2. Leave the entry as **Draft** while working.
3. Choose one of the suggested layouts or **Blank**.
4. Select a block in **Story order** to edit it in **Settings**.

Available starting layouts:

- **Photo Story** — a paced chapter with opening image, collage, sequence and note.
- **Photo Dump** — a looser photograph-heavy structure.
- **Journal** — photographs separated by short and longer writing.
- **Minimal** — opening image, caption, collage and final image.
- **Food and Places** — details, a place link and a chronological sequence.
- **Blank** — no blocks.

Templates create empty, editable placeholders. They do not add fictional memories.

## Add photographs

Choose **Photo**, **Collage** or **Photo sequence** under **Add content**.

For each photograph:

1. Choose the local image file.
2. Add useful alt text describing what can be seen, unless the image is purely decorative.
3. Add an optional caption.
4. Review the suggested repository path.

The editor shows the filename, dimensions, aspect ratio and file size. Large originals are not changed. Before publishing, create web-sized WebP or AVIF derivatives and place them in the path shown by the editor, for example:

```text
assets/log/day-03/01-harbour.webp
```

The temporary preview file stays in this browser. Exported JSON contains the intended repository path, never the temporary browser URL and never the full image binary.

## Captions, notes and journals

- **Caption** is one short line between visual moments.
- **Note** is a brief observation with an optional heading.
- **Journal** uses the same Travel Log note block with several ordered paragraphs.
- **Quote** has quote text and optional attribution.
- **Place** has a place name, optional note and optional HTTP or HTTPS map link.
- **Pause** is a small visual break with an optional label.

All writing is plain text. The editor does not accept HTML or custom CSS.

## Create a collage

Choose **Collage**, then select one controlled layout:

- **Two Up** for two photographs of similar weight.
- **Feature Left** for one dominant photograph with supporting images.
- **Feature Right** for the mirrored emphasis.
- **Film Strip** for a compact chronological group.

Use **Add photograph**, **Move up**, **Move down** and **Remove photograph** to manage one to five images. Mobile preview simplifies the collage into logical reading order.

## Reorder the story

Drag blocks in **Story order**, or use the keyboard-accessible controls:

- **Move up**
- **Move down**
- **Duplicate**
- **Delete**

Blocks containing substantial writing or selected media ask for confirmation before deletion. Undo and Redo retain the most recent editing steps for the current session.

## Change image presentation

A single photograph supports:

- **Presentation:** Full, Contained, Portrait or Quiet.
- **Width:** Full, Wide, Normal or Narrow.
- **Spacing:** Tight, Normal or Spacious.
- **Crop:** Natural, Landscape, Square or Portrait.

Use controlled options rather than pixel dimensions. This keeps the editor output compatible with the responsive public renderer.

When a crop is selected, click or drag on the focal-point image to mark the important area. Arrow keys adjust the marker in small steps. **Reset to centre** restores `50% 50%`.

## Preview desktop and mobile

The centre preview uses the same renderer as the public Travel Log.

Choose:

- **Desktop**, **Tablet** or **Mobile** width.
- **Light** or **Dark** theme.

Incomplete blocks remain listed in the editor but may be absent from the preview until their required content is supplied.

## Local saving

Text, layout and path metadata autosave to local browser storage for each day. Selected image and video blobs use browser IndexedDB when available so local previews can survive a reload.

The status changes between **Unsaved**, **Saving…** and **Saved locally**. Reloading restores the last selected day and its local draft.

**Clear local draft** removes that day’s editor data after confirmation. Export before clearing if the work matters.

## Import and export

### Export JSON

Creates an editor project file containing:

- entry metadata
- ordered blocks
- media manifest
- schema and editor versions
- export timestamp

The file does not contain image binaries. Keep the selected media separately.

### Export renderer data

Creates a renderer-compatible `day-0X.js` file. Incomplete blocks are reported and can be omitted after confirmation. User text is safely serialised as data; it is never executed.

### Copy data

Copies the clean editor JSON representation for inspection or backup.

### Import JSON

Accepts either an editor JSON export or a renderer-compatible entry represented as pure JSON. JavaScript files are not accepted. Unsupported block types and fields are ignored and reported.

## What export does not do yet

The MVP does not:

- copy or optimise image files
- create a media ZIP
- modify the repository
- update the publication manifest
- enable the public feature flag
- commit or deploy the website

Publishing remains a deliberate repository workflow. Before putting photographs in a public repository, remove ticket details, booking references, access information and any image the group has not approved.
