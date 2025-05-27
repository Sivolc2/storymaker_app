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
    const [isEditing, setIsEditing] = useState(!project?.outline.content);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setOutlineText(project.outline.content);
            // Determine editing state based on approval status
            if (project.outline.isApproved) {
                setIsEditing(false);
            } else {
                setIsEditing(true); // If not approved (new, draft, or revised), allow editing
            }
        }
    }, [project?.outline.content, project?.outline.isApproved, project]);

    useEffect(() => {
        // Clear success message after 3 seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const proceedWithGeneration = async () => {
        if (!project) return;
        setIsLoading(true);
        setError(null);
        try {
            // Concatenate uploaded documents for context
            const contextDocs = project.uploadedDocuments.map(doc => doc.content).join('\n\n');
            const conceptWithContext = project.concept.content + (contextDocs ? '\n\n--- Context Documents ---\n\n' + contextDocs : '');
            
            const data = await generateOutline(apiUrl, { concept_document: conceptWithContext });
            setOutlineText(data.outline_md);
            updateArtifact('outline', data.outline_md, false); // Save but don't auto-approve
            setIsEditing(true);
            setSuccessMessage("Outline generated successfully! You can now edit and/or approve it.");
        } catch (err: any) {
            setError(err.message || "Failed to generate outline.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateOutline = () => {
        if (!project || !project.concept.content.trim()) {
            setError("Please provide a story concept first.");
            return;
        }
        proceedWithGeneration();
    };

    const handleSaveOutline = (approve: boolean) => {
        if (!project) return;
        setError(null);
        updateArtifact('outline', outlineText, approve);
        setIsEditing(!approve);
        setSuccessMessage(approve ? "Outline approved and saved!" : "Outline saved!");
        if (approve) {
            onOutlineApproved();
        }
    };

    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('outline', outlineText, false);
        setIsEditing(true);
        setSuccessMessage("Outline approval revised. You can now edit the outline.");
    };

    if (!project) return <p>Please create or load a project first.</p>;
    if (!project.concept.content && !isLoading) {
        return <p>Please complete the 'Concept' step before generating an outline.</p>;
    }

    return (
        <div className="step-card">
            <h2>Story Outline</h2>
            <p>Generate or edit your story outline. This will structure your chapters and main plot points.</p>
            
            {(!isEditing && project.outline.isApproved) ? (
                 <div>
                    <h3>Approved Outline:</h3>
                    <div className="markdown-content">
                        <ReactMarkdown>{outlineText}</ReactMarkdown>
                    </div>
                    <div className="action-buttons">
                        <button onClick={handleReviseApproval}>Revise Approval & Edit</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="action-buttons">
                        <button onClick={handleGenerateOutline} disabled={isLoading || !project?.concept.content?.trim()}>
                            Generate Outline with AI
                        </button>
                    </div>
                    { (outlineText || isEditing) && (
                        <div style={{ marginTop: '20px' }}>
                            <h3>{project.outline.isApproved ? "Approved Outline (Editing)" : "Edit Outline:"}</h3>
                            <textarea
                                value={outlineText}
                                onChange={(e) => setOutlineText(e.target.value)}
                                rows={20}
                                style={{ width: '100%' }}
                                placeholder="Your story outline will appear here. You can also manually type or paste it."
                            />
                            <div className="action-buttons">
                                <button onClick={() => handleSaveOutline(false)} disabled={isLoading}>
                                    Save Draft
                                </button>
                                <button onClick={() => handleSaveOutline(true)} disabled={isLoading || !outlineText.trim()}>
                                    Save & Approve Outline
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
    );
};

export default OutlineTab; 