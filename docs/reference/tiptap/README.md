# TipTap React Reference Documentation

- **Official docs**: https://tiptap.dev/docs/editor/getting-started/install
- **GitHub**: https://github.com/ueberdosis/tiptap
- **Latest version**: Check npm for `@tiptap/react`
- **License**: MIT (core), Paid (Cloud/Pro features)

## Installation

```bash
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

## Core React Usage

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const TiptapEditor = () => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
    ],
    content: '<p>Hello World!</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      const text = editor.getText();
    },
  });

  return <EditorContent editor={editor} />;
};
```

## StarterKit Includes (all free)

Bold, Italic, Strike, Code, CodeBlock, Blockquote, BulletList, OrderedList, ListItem, Heading, HorizontalRule, Paragraph, HardBreak, History (undo/redo), Dropcursor, Gapcursor

## Free Extensions (selection)

- `@tiptap/extension-placeholder` — placeholder text
- `@tiptap/extension-image` — images
- `@tiptap/extension-table` — tables (with `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`)
- `@tiptap/extension-link` — links
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — task lists
- `@tiptap/extension-highlight` — text highlighting
- `@tiptap/extension-typography` — smart quotes, dashes
- `@tiptap/extension-character-count` — character count
- `@tiptap/extension-code-block-lowlight` — syntax highlighting
- `@tiptap/extension-mention` — @mentions
- `@tiptap/extension-text-align` — text alignment
- `@tiptap/extension-subscript` / `@tiptap/extension-superscript`
- `@tiptap/extension-underline`
- `@tiptap/suggestion` — autocomplete/suggestion plugin

## Free Features

- Custom extension development (full API)
- Collaborative editing (via Yjs + Hocuspocus, open source)
- Markdown shortcuts (type `# ` → heading, `- ` → list, `> ` → blockquote)
- BubbleMenu and FloatingMenu components
- Content serialization: HTML, JSON, Markdown (via `@tiptap/extension-markdown`)

## Paid Features (TipTap Cloud / Pro)

- **Comments** — inline commenting system
- **AI** — AI-powered text generation/editing
- **Version History** — track and revert document versions
- **Collaboration** with persistence (Hocuspocus Cloud)

## Content Output

```ts
// Get content in various formats
const html = editor.getHTML();
const json = editor.getJSON();
const text = editor.getText();

// Set content
editor.commands.setContent('<p>New content</p>');

// Markdown (requires extension)
import { Markdown } from '@tiptap/extension-markdown'; // or tiptap-markdown
```

## BubbleMenu & FloatingMenu

```tsx
import { BubbleMenu, FloatingMenu } from '@tiptap/react';

<BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
  <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
</BubbleMenu>

<FloatingMenu editor={editor}>
  <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
</FloatingMenu>
```

## Keyboard Shortcuts (via StarterKit)

- `Ctrl+B` — Bold
- `Ctrl+I` — Italic
- `Ctrl+Z` — Undo
- `Ctrl+Shift+Z` / `Ctrl+Y` — Redo
- `Enter` — New paragraph
- `# + Space` — Heading 1
- `## + Space` — Heading 2
- `- + Space` — Bullet list
- `1. + Space` — Ordered list
- `> + Space` — Blockquote
- `` ` `` + Space — Inline code

Custom shortcuts can be added via the `keyboardShortcuts` extension option or custom extensions.
