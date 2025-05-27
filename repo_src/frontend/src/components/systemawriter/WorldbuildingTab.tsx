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
}

const WorldbuildingTab: React.FC<WorldbuildingTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onWorldbuildingApproved }) => {
    const { project, updateArtifact } = useProject();
    const [worldbuildingText, setWorldbuildingText] = useState(project?.worldbuilding.content || '');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (project) {
            setWorldbuildingText(project.worldbuilding.content);
        }
    }, [project?.worldbuilding.content]);

    const handleGenerateWorldbuilding = async () => {
        if (!project || !project.concept.content.trim() || !project.outline.content.trim()) {
            setError("Please provide a story concept and approved outline first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Include uploaded documents for context
            const contextDocs = project.uploadedDocuments.map(doc => doc.content).join('\n\n');
            const conceptWithContext = project.concept.content + (contextDocs ? '\n\n--- Context Documents ---\n\n' + contextDocs : '');
            
            const data = await generateWorldbuilding(apiUrl, { 
                concept_document: conceptWithContext,
                approved_outline_md: project.outline.content 
            });
            setWorldbuildingText(data.worldbuilding_md);
            updateArtifact('worldbuilding', data.worldbuilding_md, false); // Save but don't auto-approve
        } catch (err: any) {
            setError(err.message || "Failed to generate worldbuilding.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveWorldbuilding = () => {
        if (!project) return;
        setError(null);
        updateArtifact('worldbuilding', worldbuildingText, project.worldbuilding.isApproved);
        setIsEditing(false);
    };

    const handleApproveWorldbuilding = () => {
        if (!project || !worldbuildingText.trim()) {
            setError("Worldbuilding cannot be empty to approve.");
            return;
        }
        updateArtifact('worldbuilding', worldbuildingText, true);
        setIsEditing(false);
        onWorldbuildingApproved();
    };

    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('worldbuilding', worldbuildingText, false);
        setIsEditing(true);
    };

    if (!project) return <p>Please create or load a project first.</p>;

    return (
        <div className="step-card">
            <h2>3. Worldbuilding</h2>
            <p>Generate or edit your worldbuilding details including character profiles, setting descriptions, and background information.</p>
            
            <div className="action-buttons">
                <button onClick={handleGenerateWorldbuilding} disabled={isLoading || project.worldbuilding.isApproved}>
                    Generate Worldbuilding with AI
                </button>
                {worldbuildingText && !isEditing && !project.worldbuilding.isApproved && (
                    <button onClick={() => setIsEditing(true)}>
                        Edit Worldbuilding
                    </button>
                )}
            </div>

            {worldbuildingText && (
                <div style={{ marginTop: '20px' }}>
                    {isEditing || !project.worldbuilding.isApproved ? (
                        <div>
                            <h3>Edit Worldbuilding:</h3>
                            <textarea
                                value={worldbuildingText}
                                onChange={(e) => setWorldbuildingText(e.target.value)}
                                rows={20}
                                style={{ width: '100%' }}
                            />
                            <div className="action-buttons">
                                <button onClick={handleSaveWorldbuilding}>
                                    Save Worldbuilding
                                </button>
                                <button onClick={handleApproveWorldbuilding} disabled={!worldbuildingText.trim()}>
                                    Approve Worldbuilding & Proceed to Scene Breakdowns &raquo;
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
                            <h3>Generated Worldbuilding:</h3>
                            <div className="markdown-content">
                                <ReactMarkdown>{worldbuildingText}</ReactMarkdown>
                            </div>
                            {project.worldbuilding.isApproved && (
                                <p className="approved-text">
                                    ✓ Worldbuilding Approved. 
                                    <button onClick={handleReviseApproval}>Revise Approval</button>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WorldbuildingTab; 