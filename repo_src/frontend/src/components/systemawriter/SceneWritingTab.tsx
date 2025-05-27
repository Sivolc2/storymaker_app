import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateSceneNarrative } from '../../services/systemaWriterService';

interface SceneWritingTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void;
    initialSceneDetails?: {chapterTitle: string, sceneIdentifier: string} | null;
    setInitialSceneDetails?: React.Dispatch<React.SetStateAction<{chapterTitle: string, sceneIdentifier: string} | null>>;
}

const SceneWritingTab: React.FC<SceneWritingTabProps> = ({ 
    apiUrl, 
    isLoading, 
    setIsLoading, 
    setError, 
    showPrerequisiteWarning,
    initialSceneDetails,
    setInitialSceneDetails
}) => {
    const { project, updateSceneNarrative, getSceneNarrative } = useProject();
    const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
    const [selectedChapter, setSelectedChapter] = useState<string>('');
    const [sceneIdentifier, setSceneIdentifier] = useState<string>('');
    const [scenePlan, setScenePlan] = useState<string>('');
    const [writingStyleNotes, setWritingStyleNotes] = useState<string>('');
    const [generatedNarrative, setGeneratedNarrative] = useState<string>('');
    const [editedNarrative, setEditedNarrative] = useState<string>('');
    const [isEditingNarrative, setIsEditingNarrative] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project && project.sceneBreakdowns.content) {
            try {
                const parsed = JSON.parse(project.sceneBreakdowns.content);
                setSceneBreakdownsData(parsed);
                // Auto-select first chapter if none selected
                if (!selectedChapter && Object.keys(parsed).length > 0) {
                    setSelectedChapter(Object.keys(parsed)[0]);
                }
            } catch {
                setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
                setSelectedChapter("All Chapters");
            }
        }
    }, [project?.sceneBreakdowns.content, selectedChapter]);

    // Handle initialSceneDetails for editing specific scenes from left panel
    useEffect(() => {
        if (initialSceneDetails && project) {
            setSelectedChapter(initialSceneDetails.chapterTitle);
            setSceneIdentifier(initialSceneDetails.sceneIdentifier);
            
            // Load the existing scene content
            const existingScene = getSceneNarrative(initialSceneDetails.chapterTitle, initialSceneDetails.sceneIdentifier);
            if (existingScene) {
                setEditedNarrative(existingScene.content);
                setGeneratedNarrative(existingScene.content);
                setIsEditingNarrative(true);
            }
            
            // Clear the initial scene details after loading
            if (setInitialSceneDetails) {
                setInitialSceneDetails(null);
            }
        }
    }, [initialSceneDetails, project, getSceneNarrative, setInitialSceneDetails]);

    useEffect(() => {
        // Clear success message after 3 seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const proceedWithGeneration = async () => {
        if (!project || !selectedChapter || !sceneIdentifier.trim() || !scenePlan.trim()) {
            setError("Please select a chapter, provide a scene identifier, and enter a scene plan.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fullChapterBreakdown = sceneBreakdownsData?.[selectedChapter] || '';
            const data = await generateSceneNarrative(apiUrl, {
                scene_plan_from_breakdown: scenePlan,
                chapter_title: selectedChapter,
                full_chapter_scene_breakdown: fullChapterBreakdown,
                approved_worldbuilding_md: project.worldbuilding.content,
                full_approved_outline_md: project.outline.content,
                writing_style_notes: writingStyleNotes || undefined
            });
            setGeneratedNarrative(data.scene_narrative_md);
            setEditedNarrative(data.scene_narrative_md);
            setIsEditingNarrative(true);
        } catch (err: any) {
            setError(err.message || "Failed to generate scene narrative.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSceneNarrative = () => {
        if (!project || !selectedChapter || !sceneIdentifier.trim() || !scenePlan.trim()) {
            setError("Please select a chapter, provide a scene identifier, and enter a scene plan.");
            return;
        }
        if (!project.sceneBreakdowns.isApproved) {
            showPrerequisiteWarning(
                "The Scene Breakdowns are not yet approved. Generating scene narratives with unapproved breakdowns might lead to rework. Do you want to proceed?",
                proceedWithGeneration
            );
        } else {
            proceedWithGeneration();
        }
    };

    const handleSaveSceneToProject = () => {
        if (!project || !selectedChapter || !sceneIdentifier.trim() || !editedNarrative.trim()) {
            setError("Cannot save scene: missing chapter, identifier, or narrative content.");
            return;
        }

        const sceneNarrative = {
            content: editedNarrative,
            isApproved: true, // Scenes are considered approved when saved
            lastModified: new Date(),
            sceneIdentifier: sceneIdentifier,
            chapterTitle: selectedChapter,
            sceneOrderHeuristic: parseFloat(sceneIdentifier.match(/\d+\.?\d*/)?.[0] || "999"),
        };

        updateSceneNarrative(sceneNarrative);
        
        // Reset form for next scene
        setSceneIdentifier('');
        setScenePlan('');
        setGeneratedNarrative('');
        setEditedNarrative('');
        setIsEditingNarrative(false);
        setSuccessMessage("Scene saved successfully!");
    };

    const handleLoadExistingScene = () => {
        if (!project || !selectedChapter || !sceneIdentifier.trim()) return;
        
        const existingScene = getSceneNarrative(selectedChapter, sceneIdentifier);
        if (existingScene) {
            setEditedNarrative(existingScene.content);
            setGeneratedNarrative(existingScene.content);
            setIsEditingNarrative(true);
        } else {
            setError("No existing scene found with that identifier.");
        }
    };

    if (!project) return <p>Please create or load a project first.</p>;
    if (!project.sceneBreakdowns.content && !isLoading) {
        return <p>Please complete the 'Scene Breakdowns' step before writing scenes.</p>;
    }

    const savedScenesCount = project.sceneNarratives.length;

    return (
        <div className="step-card">
            <h2>Scene Writing</h2>
            <p>Generate individual scene narratives based on your approved scene breakdowns.</p>
            
            {savedScenesCount > 0 && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: 'var(--success-bg, #1a4a1a)', borderRadius: '5px' }}>
                    <p>✓ {savedScenesCount} scene(s) saved to project</p>
                </div>
            )}

            <div style={{ marginBottom: '20px' }}>
                <h3>Select Chapter:</h3>
                <select 
                    value={selectedChapter} 
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                >
                    <option value="">-- Select a Chapter --</option>
                    {sceneBreakdownsData && Object.keys(sceneBreakdownsData).map(chapter => (
                        <option key={chapter} value={chapter}>{chapter}</option>
                    ))}
                </select>
            </div>

            {selectedChapter && sceneBreakdownsData && (
                <div style={{ marginBottom: '20px' }}>
                    <h3>Chapter Breakdown: {selectedChapter}</h3>
                    <div style={{ 
                        border: '1px solid #444', 
                        padding: '15px', 
                        borderRadius: '5px',
                        backgroundColor: 'var(--input-bg-color, #2a2a2a)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        <ReactMarkdown>{sceneBreakdownsData[selectedChapter]}</ReactMarkdown>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '20px' }}>
                <h3>Scene Setup:</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="sceneIdentifier">Scene Identifier:</label>
                    <input
                        type="text"
                        id="sceneIdentifier"
                        value={sceneIdentifier}
                        onChange={(e) => setSceneIdentifier(e.target.value)}
                        placeholder="e.g., Scene 1.1, The Confrontation, etc."
                        style={{ width: '100%', padding: '8px' }}
                    />
                    <button onClick={handleLoadExistingScene} disabled={!sceneIdentifier.trim()}>
                        Load Existing Scene
                    </button>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="scenePlan">Scene Plan (copy from breakdown above):</label>
                    <textarea
                        id="scenePlan"
                        value={scenePlan}
                        onChange={(e) => setScenePlan(e.target.value)}
                        placeholder="Copy the specific scene plan from the chapter breakdown above..."
                        rows={5}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="writingStyle">Writing Style Notes (optional):</label>
                    <textarea
                        id="writingStyle"
                        value={writingStyleNotes}
                        onChange={(e) => setWritingStyleNotes(e.target.value)}
                        placeholder="e.g., First person, past tense, descriptive, dialogue-heavy..."
                        rows={3}
                        style={{ width: '100%' }}
                    />
                </div>

                <button 
                    onClick={handleGenerateSceneNarrative} 
                    disabled={isLoading || !selectedChapter || !sceneIdentifier.trim() || !scenePlan.trim()}
                >
                    Generate Scene Narrative
                </button>
            </div>

            {(generatedNarrative || editedNarrative) && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Scene Narrative:</h3>
                    {isEditingNarrative ? (
                        <div>
                            <textarea
                                value={editedNarrative}
                                onChange={(e) => setEditedNarrative(e.target.value)}
                                rows={20}
                                style={{ width: '100%' }}
                            />
                            <div className="action-buttons">
                                <button onClick={handleSaveSceneToProject} disabled={!editedNarrative.trim()}>
                                    Save Scene to Project
                                </button>
                                <button onClick={() => setIsEditingNarrative(false)}>
                                    Preview
                                </button>
                                <button onClick={handleGenerateSceneNarrative} disabled={isLoading}>
                                    Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="markdown-content" style={{ 
                                border: '1px solid #444', 
                                padding: '15px', 
                                borderRadius: '5px',
                                backgroundColor: 'var(--input-bg-color, #2a2a2a)'
                            }}>
                                <ReactMarkdown>{editedNarrative}</ReactMarkdown>
                            </div>
                            <div className="action-buttons">
                                <button onClick={() => setIsEditingNarrative(true)}>
                                    Edit Narrative
                                </button>
                                <button onClick={handleSaveSceneToProject} disabled={!editedNarrative.trim()}>
                                    Save Scene to Project
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {successMessage && (
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'var(--success-bg, #1a4a1a)', borderRadius: '5px' }}>
                    <p>{successMessage}</p>
                </div>
            )}
        </div>
    );
};

export default SceneWritingTab; 