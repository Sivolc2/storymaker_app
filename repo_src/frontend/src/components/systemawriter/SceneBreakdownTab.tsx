import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateSceneBreakdowns } from '../../services/systemaWriterService';

interface SceneBreakdownTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onBreakdownsApproved: () => void;
    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void;
}

const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onBreakdownsApproved, showPrerequisiteWarning }) => {
    const { project, updateArtifact } = useProject();
    const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project && project.sceneBreakdowns.content) {
            try {
                // Try to parse the stored content as JSON
                const parsed = JSON.parse(project.sceneBreakdowns.content);
                setSceneBreakdownsData(parsed);
            } catch {
                // If it's not JSON, treat it as a single markdown string
                setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
            }
        }
    }, [project?.sceneBreakdowns.content]);

    useEffect(() => {
        // Clear success message after 3 seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const proceedWithGeneration = async () => {
        if (!project) return; // Should not happen if component is rendered
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateSceneBreakdowns(apiUrl, {
                approved_outline_md: project.outline.content,
                approved_worldbuilding_md: project.worldbuilding.content
            });
            setSceneBreakdownsData(data.scene_breakdowns_by_chapter);
            // Store as JSON string in the project context
            updateArtifact('sceneBreakdowns', JSON.stringify(data.scene_breakdowns_by_chapter), false);
            setSuccessMessage("Scene breakdowns generated successfully! You can now approve them.");
        } catch (err: any) {
            setError(err.message || "Failed to generate scene breakdowns.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSceneBreakdowns = () => {
        if (!project || !project.outline.content.trim() || !project.worldbuilding.content.trim()) {
            setError("Please provide approved outline and worldbuilding first.");
            return;
        }
        if (!project.worldbuilding.isApproved) {
            showPrerequisiteWarning(
                "The Worldbuilding is not yet approved. Generating scene breakdowns with unapproved worldbuilding might lead to rework. Do you want to proceed?",
                proceedWithGeneration
            );
        } else {
            proceedWithGeneration();
        }
    };

    const handleApproveBreakdowns = () => {
        if (!project || !sceneBreakdownsData) {
            setError("Scene breakdowns must be generated first.");
            return;
        }
        updateArtifact('sceneBreakdowns', JSON.stringify(sceneBreakdownsData), true);
        setSuccessMessage("Scene breakdowns approved and saved!");
        onBreakdownsApproved();
    };

    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('sceneBreakdowns', project.sceneBreakdowns.content, false);
        setSuccessMessage("Scene breakdowns approval revised.");
    };

    if (!project) return <p>Please create or load a project first.</p>;
    if (!project.worldbuilding.content && !isLoading) { // Added !isLoading check
        return <p>Please complete the 'Worldbuilding' step before generating scene breakdowns.</p>;
    }

    return (
        <div className="step-card">
            <h2>Scene Breakdowns</h2>
            <p>Generate detailed scene plans for each chapter. These will guide the individual scene writing process.</p>
            
            <div className="action-buttons">
                <button onClick={handleGenerateSceneBreakdowns} disabled={isLoading}>
                    Generate Scene Breakdowns with AI
                </button>
                {sceneBreakdownsData && !project.sceneBreakdowns.isApproved && (
                    <button onClick={handleApproveBreakdowns}>
                        Save & Approve Scene Breakdowns
                    </button>
                )}
            </div>

            {project.sceneBreakdowns.isApproved && (
                <p className="approved-text">
                    ✓ Scene Breakdowns Approved. 
                    <button onClick={handleReviseApproval}>Revise Approval</button>
                </p>
            )}

            {sceneBreakdownsData && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Generated Scene Breakdowns:</h3>
                    {Object.entries(sceneBreakdownsData).map(([chapterTitle, breakdownMd]) => (
                        <div key={chapterTitle} style={{ marginBottom: '30px' }}>
                            <h4>{chapterTitle}</h4>
                            <div className="markdown-content" style={{ 
                                border: '1px solid #444', 
                                padding: '15px', 
                                borderRadius: '5px',
                                backgroundColor: 'var(--input-bg-color, #2a2a2a)'
                            }}>
                                <ReactMarkdown>{breakdownMd}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
    );
};

export default SceneBreakdownTab; 