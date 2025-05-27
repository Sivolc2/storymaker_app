import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateWorldbuilding } from '../../services/systemaWriterService';

interface WorldbuildingTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onWorldbuildingApproved: () => void;
    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void;
}

const WorldbuildingTab: React.FC<WorldbuildingTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onWorldbuildingApproved, showPrerequisiteWarning }) => {
    const { project, updateArtifact } = useProject();
    const [worldbuildingText, setWorldbuildingText] = useState(project?.worldbuilding.content || '');
    const [isEditing, setIsEditing] = useState(!project?.worldbuilding.content);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setWorldbuildingText(project.worldbuilding.content);
            if (!project.worldbuilding.content && !project.worldbuilding.isApproved) {
                setIsEditing(true);
            } else if (project.worldbuilding.isApproved) {
                setIsEditing(false);
            }
        }
    }, [project?.worldbuilding.content, project?.worldbuilding.isApproved]);

    useEffect(() => {
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
            const contextDocs = project.uploadedDocuments.map(doc => doc.content).join('\n\n');
            const conceptWithContext = project.concept.content + (contextDocs ? '\n\n--- Context Documents ---\n\n' + contextDocs : '');
            
            const data = await generateWorldbuilding(apiUrl, { 
                concept_document: conceptWithContext,
                approved_outline_md: project.outline.content 
            });
            setWorldbuildingText(data.worldbuilding_md);
            updateArtifact('worldbuilding', data.worldbuilding_md, false);
            setIsEditing(true);
            setSuccessMessage("Worldbuilding generated successfully! You can now edit and/or approve it.");
        } catch (err: any) {
            setError(err.message || "Failed to generate worldbuilding.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateWorldbuilding = () => {
        if (!project || !project.concept.content.trim() || !project.outline.content.trim()) {
            setError("Please provide a story concept and outline first.");
            return;
        }
        if (!project.outline.isApproved) {
            showPrerequisiteWarning(
                "The Story Outline is not yet approved. Generating worldbuilding with an unapproved outline might lead to rework. Do you want to proceed?",
                proceedWithGeneration
            );
        } else {
            proceedWithGeneration();
        }
    };

    const handleSaveWorldbuilding = (approve: boolean) => {
        if (!project) return;
        setError(null);
        updateArtifact('worldbuilding', worldbuildingText, approve);
        setIsEditing(!approve);
        setSuccessMessage(approve ? "Worldbuilding approved and saved!" : "Worldbuilding saved!");
        if (approve) {
            onWorldbuildingApproved();
        }
    };

    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('worldbuilding', worldbuildingText, false);
        setIsEditing(true);
        setSuccessMessage("Worldbuilding approval revised. You can now edit the worldbuilding.");
    };

    if (!project) return <p>Please create or load a project first.</p>;
    if (!project.outline.content && !isLoading) {
        return <p>Please complete the 'Outline' step before generating worldbuilding.</p>;
    }

    return (
        <div className="step-card">
            <h2>Worldbuilding</h2>
            <p>Generate or edit your worldbuilding details including character profiles, setting descriptions, and background information.</p>
            
            {(!isEditing && project.worldbuilding.isApproved) ? (
                 <div>
                    <h3>Approved Worldbuilding:</h3>
                    <div className="markdown-content">
                        <ReactMarkdown>{worldbuildingText}</ReactMarkdown>
                    </div>
                    <div className="action-buttons">
                        <button onClick={handleReviseApproval}>Revise Approval & Edit</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="action-buttons">
                        <button onClick={handleGenerateWorldbuilding} disabled={isLoading}>
                            Generate Worldbuilding with AI
                        </button>
                    </div>
                    { (worldbuildingText || isEditing) && (
                        <div style={{ marginTop: '20px' }}>
                            <h3>{project.worldbuilding.isApproved ? "Approved Worldbuilding (Editing)" : "Edit Worldbuilding:"}</h3>
                            <textarea
                                value={worldbuildingText}
                                onChange={(e) => setWorldbuildingText(e.target.value)}
                                rows={20}
                                style={{ width: '100%' }}
                                placeholder="Your worldbuilding details will appear here. You can also manually type or paste them."
                            />
                            <div className="action-buttons">
                                <button onClick={() => handleSaveWorldbuilding(false)} disabled={isLoading}>
                                    Save Draft
                                </button>
                                <button onClick={() => handleSaveWorldbuilding(true)} disabled={isLoading || !worldbuildingText.trim()}>
                                    Save & Approve Worldbuilding
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

export default WorldbuildingTab; 