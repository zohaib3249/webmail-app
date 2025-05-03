import { Editor } from "primereact/editor";

interface MyRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const MyRichTextEditor: React.FC<MyRichTextEditorProps> = ({ value, onChange }) => {
  const handleEditorChange = (e: any) => {
    onChange(e.htmlValue || '');
  };

  return (
    <div style={{ border: 'none' }}>
      <Editor
        value={value}
        aria-placeholder="Start typing..."
        onTextChange={handleEditorChange}
        style={{
          height: '200px',
          padding: '0px',
          border: 'none',
          background: 'transparent',
        }}
        placeholder="Start typing..."
      />
    </div>
  );
};

export default MyRichTextEditor;
