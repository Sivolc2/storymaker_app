import React, { useState, useEffect } from 'react';
import { UploadedDocument } from '../../contexts/ProjectContext';

interface DocumentEditorProps {
    document: UploadedDocument;
    onSave: (docId: string, newContent: string) => void;
    onCancel: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onSave, onCancel }) => {
    const [content, setContent] = useState(document.content);

    useEffect(() => {
        setContent(document.content);
    }, [document]);

    const handleSave = () => {
        onSave(document.id, content);
    };

    return (
        <div className="step-card document-editor-card">
            <h2>Editing: {document.name}</h2>
            <p>Modify the content of your uploaded document below.</p>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <div className="action-buttons">
                <button onClick={handleSave}>Save Changes</button>
                <button onClick={onCancel} className="button-secondary">Cancel</button>
            </div>
        </div>
    );
};

export default DocumentEditor; 