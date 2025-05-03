import React, { useRef, useEffect } from 'react';

const EmailBodyViewer: React.FC<{ html: string }> = ({ html }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const updateContent = () => {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc?.body) {
        const htmlContent = iframeDoc.body.innerHTML;

        // Try to find the quoted part
        const quoteRegex = /On .* wrote:/i;
        const match = htmlContent.match(quoteRegex);

        if (match) {
          const index = htmlContent.indexOf(match[0]);
          const mainContent = htmlContent.slice(0, index);
          const quotedContent = htmlContent.slice(index);

          // Build the updated HTML
          iframeDoc.body.innerHTML = `
            <div>${mainContent}</div>
            <div id="quoted-text" style="display: none; margin-top: 1rem; color: gray; font-size: 0.9em;">
              ${quotedContent}
            </div>
            <button id="show-quote-button" style="margin-top: 1rem; background: none; color: blue; border: none; cursor: pointer;">Show quoted text</button>
          `;

          const button = iframeDoc.getElementById('show-quote-button');
          const quotedDiv = iframeDoc.getElementById('quoted-text');

          if (button && quotedDiv) {
            button.onclick = () => {
              quotedDiv.style.display = 'block';
              button.style.display = 'none';
            };
          }
        }

        // Resize iframe after DOM updates
        setTimeout(() => {
          iframe.style.height = `${iframeDoc.body.scrollHeight}px`;
        }, 100);
      }
    };

    iframe.addEventListener('load', updateContent);

    return () => {
      iframe.removeEventListener('load', updateContent);
    };
  }, [html]);

  return (
    <div className="p-6 border-b">
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        srcDoc={html}
        title="Email Body"
        className="w-full"
        style={{
          border: 'none',
          overflow: 'hidden',
          width: '100%',
          minHeight: '200px',
        }}
      />
    </div>
  );
};

export default EmailBodyViewer;
