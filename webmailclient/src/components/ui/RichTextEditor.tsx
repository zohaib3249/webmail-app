import React from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor as EditorType } from '@tiptap/react';

interface RichTextEditorProps {
  editor: EditorType | null;
}

/**
 * A bare-bones rich text area that expands to fill its container,
 * strips all borders/padding, and integrates with a Tiptap editor instance.
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <EditorContent
        editor={editor}
        className="h-full w-full p-0 m-0 border-0 focus:outline-none focus:ring-0"
        style={{ border: 'none', outline: 'none' }}
      />
    </div>
  );
};

export default RichTextEditor;
