import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateOutline } from '../../services/systemaWriterService';

interface OutlineTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onOutlineApproved: () => void;
}

const OutlineTab: React.FC<OutlineTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onOutlineApproved }) => {
    const { project, updateArtifact } = useProject();
    const [outlineText, setOutlineText] = useState(project?.outline.content || '');
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setOutlineText(project.outline.content);
        }
    }, [project?.outline.content]);

    useEffect(() => {
        // Clear success message after 3 seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleGenerateOutline = async () => {
        if (!project || !project.concept.content.trim()) {
            setError("Please provide a story concept first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Concatenate uploaded documents for context
            const contextDocs = project.uploadedDocuments.map(doc => doc.content).join('\n\n');
            const conceptWithContext = project.concept.content + (contextDocs ? '\n\n--- Context Documents ---\n\n' + contextDocs : '');
            
            const data = await generateOutline(apiUrl, { concept_document: conceptWithContext });
            setOutlineText(data.outline_md);
            updateArtifact('outline', data.outline_md, false); // Save but don't auto-approve
            setSuccessMessage("Outline generated successfully!");
        } catch (err: any) {
            setError(err.message || "Failed to generate outline.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOutline = () => {
        if (!project) return;
        setError(null);
        updateArtifact('outline', outlineText, project.outline.isApproved);
        setIsEditing(false);
        setSuccessMessage("Outline saved successfully!");
    };

    const handleApproveOutline = () => {
        if (!project || !outlineText.trim()) {
            setError("Outline cannot be empty to approve.");
            return;
        }
        updateArtifact('outline', outlineText, true);
        setIsEditing(false);
        onOutlineApproved();
        setSuccessMessage("Outline approved and proceeding to worldbuilding!");
    };

    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('outline', outlineText, false);
        setIsEditing(true);
        setSuccessMessage("Outline revised and awaiting approval.");
    };

    if (!project) return <p>Please create or load a project first.</p>;

    return (
        <div className="step-card">
            <h2>2. Story Outline</h2>
            <p>Generate or edit your story outline. This will structure your chapters and main plot points.</p>
            
            <div className="action-buttons">
                <button onClick={handleGenerateOutline} disabled={isLoading || project.outline.isApproved}>
                    Generate Outline with AI
                </button>
                {outlineText && !isEditing && !project.outline.isApproved && (
                    <button onClick={() => setIsEditing(true)}>
                        Edit Outline
                    </button>
                )}
            </div>

            {outlineText && (
                <div style={{ marginTop: '20px' }}>
                    {isEditing || !project.outline.isApproved ? (
                        <div>
                            <h3>Edit Outline:</h3>
                            <textarea
                                value={outlineText}
                                onChange={(e) => setOutlineText(e.target.value)}
                                rows={20}
                                style={{ width: '100%' }}
                            />
                            <div className="action-buttons">
                                <button onClick={handleSaveOutline}>
                                    Save Outline
                                </button>
                                <button onClick={handleApproveOutline} disabled={!outlineText.trim()}>
                                    Approve Outline & Proceed to Worldbuilding &raquo;
                                </button>
                                {isEditing && (
                                    <button onClick={() => setIsEditing(false)}>
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3>Generated Outline:</h3>
                            <div className="markdown-content">
                                <ReactMarkdown>{outlineText}</ReactMarkdown>
                            </div>
                            {project.outline.isApproved && (
                                <p className="approved-text">
                                    ✓ Outline Approved. 
                                    <button onClick={handleReviseApproval}>Revise Approval</button>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
            {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
    );
};

export default OutlineTab; 