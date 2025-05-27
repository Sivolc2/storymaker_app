import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateSceneBreakdowns } from '../../services/systemaWriterService';

interface ParsedScene {
    sceneNumber?: string;
    goal?: string;
    charactersPresent?: string;
    keyEvents?: string;
    setting?: string;
    informationRevealed?: string;
    emotionalShift?: string;
    rawContent: string; // Store the raw part of the markdown for this scene
}

interface SceneBreakdownTabProps {
    apiUrl: string;
    isLoading: boolean; // Global loading state from parent
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onBreakdownsApproved: () => void;
    onSelectSceneForWriting: (chapterTitle: string, sceneIdentifier: string, scenePlan: string) => void;
}

const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading: _isLoading, setIsLoading: _setIsLoading, setError, onBreakdownsApproved, onSelectSceneForWriting }) => {
    const { project, updateArtifact, setProjectLoading } = useProject();
    const [isGeneratingBreakdowns, setIsGeneratingBreakdowns] = useState(false); // Local loading state for this tab
    const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
    const [parsedBreakdowns, setParsedBreakdowns] = useState<{[chapterTitle: string]: ParsedScene[]} | null>(null);
    const [totalParsedScenes, setTotalParsedScenes] = useState(0);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project && project.sceneBreakdowns.content) {
            try {
                // Try to parse the stored content as JSON
                const parsed = JSON.parse(project.sceneBreakdowns.content);
                setSceneBreakdownsData(parsed);
                parseAndSetBreakdowns(parsed);
            } catch {
                // If it's not JSON, treat it as a single markdown string
                setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
                parseAndSetBreakdowns({ "All Chapters": project.sceneBreakdowns.content });
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

    const parseSceneDetailsFromMarkdown = (markdown: string): ParsedScene[] => {
        const scenes: ParsedScene[] = [];
        // Split by lines and look for scene markers
        const lines = markdown.split('\n');
        let currentScene: ParsedScene | null = null;
        let currentSceneLines: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this line starts a new scene
            if (trimmedLine.match(/^-\s*\*\*(Scene\s*(Number|ID|\d+))/i)) {
                // Save previous scene if exists
                if (currentScene) {
                    currentScene.rawContent = currentSceneLines.join('\n');
                    scenes.push(currentScene);
                }
                
                // Start new scene
                currentScene = { rawContent: '' };
                currentSceneLines = [line];
                
                // Extract scene number from this line
                const sceneMatch = trimmedLine.match(/Scene\s*(\d+(?:\.\d+)?|\w+)/i);
                if (sceneMatch) {
                    currentScene.sceneNumber = sceneMatch[0];
                }
            } else if (currentScene) {
                // Add line to current scene
                currentSceneLines.push(line);
                
                // Parse specific fields
                const cleanLine = trimmedLine.replace(/^-\s*\*\*/, '').replace(/\*\*:?/, '');
                if (cleanLine.toLowerCase().startsWith('goal')) {
                    currentScene.goal = cleanLine.substring('goal'.length).replace(/^:\s*/, '').trim();
                } else if (cleanLine.toLowerCase().startsWith('characters present')) {
                    currentScene.charactersPresent = cleanLine.substring('characters present'.length).replace(/^:\s*/, '').trim();
                } else if (cleanLine.toLowerCase().startsWith('key events')) {
                    currentScene.keyEvents = cleanLine.substring('key events'.length).replace(/^[:/]\s*/, '').trim();
                } else if (cleanLine.toLowerCase().startsWith('setting')) {
                    currentScene.setting = cleanLine.substring('setting'.length).replace(/^:\s*/, '').trim();
                } else if (cleanLine.toLowerCase().startsWith('information revealed')) {
                    currentScene.informationRevealed = cleanLine.substring('information revealed'.length).replace(/^:\s*/, '').trim();
                } else if (cleanLine.toLowerCase().startsWith('emotional shift')) {
                    currentScene.emotionalShift = cleanLine.substring('emotional shift'.length).replace(/^[:/]\s*/, '').trim();
                }
            }
        }
        
        // Don't forget the last scene
        if (currentScene) {
            currentScene.rawContent = currentSceneLines.join('\n');
            scenes.push(currentScene);
        }
        
        return scenes;
    };

    const parseAndSetBreakdowns = (data: {[chapterTitle: string]: string}) => {
        const parsedData: {[chapterTitle: string]: ParsedScene[]} = {};
        let totalScenes = 0;
        for (const chapterTitle in data) {
            const scenes = parseSceneDetailsFromMarkdown(data[chapterTitle]);
            parsedData[chapterTitle] = scenes;
            totalScenes += scenes.length;
        }
        setParsedBreakdowns(parsedData);
        setTotalParsedScenes(totalScenes);
    };

    const proceedWithGeneration = async () => {
        if (!project) return; // Should not happen if component is rendered
        setProjectLoading(true);
        setIsGeneratingBreakdowns(true);
        setError(null);
        try {
            const data = await generateSceneBreakdowns(apiUrl, {
                approved_outline_md: project.outline.content,
                approved_worldbuilding_md: project.worldbuilding.content
            });
            setSceneBreakdownsData(data.scene_breakdowns_by_chapter);
            // Store as JSON string in the project context
            parseAndSetBreakdowns(data.scene_breakdowns_by_chapter);
            updateArtifact('sceneBreakdowns', JSON.stringify(data.scene_breakdowns_by_chapter), false);
            setSuccessMessage("Scene breakdowns generated successfully! You can now approve them.");
        } catch (err: any) {
            setError(err.message || "Failed to generate scene breakdowns.");
        } finally {
            setIsGeneratingBreakdowns(false);
            setProjectLoading(false);
        }
    };

    const handleGenerateSceneBreakdowns = () => {
        if (!project || !project.outline.content.trim() || !project.worldbuilding.content.trim()) {
            setError("Please provide approved outline and worldbuilding first.");
            return;
        }
        proceedWithGeneration();
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
    if (!project.worldbuilding.content && !project.isLoading && !isGeneratingBreakdowns) {
        return <p>Please complete the 'Worldbuilding' step before generating scene breakdowns.</p>;
    }
    const ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION = 45; // e.g., 45 seconds per scene narrative

    return (
        <div className="step-card">
            <h2>Scene Breakdowns</h2>
            <p>Generate detailed scene plans for each chapter. These will guide the individual scene writing process.</p>
            
            <div className="action-buttons">
                <button onClick={handleGenerateSceneBreakdowns} disabled={project.isLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
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

            {isGeneratingBreakdowns && <p>Generating breakdowns, please wait...</p>}

            {totalParsedScenes > 0 && !isGeneratingBreakdowns && (
                <div style={{ margin: '15px 0', padding: '10px', backgroundColor: 'var(--info-bg, #1f3a4d)', borderRadius: '4px' }}>
                    <p>Found <strong>{totalParsedScenes}</strong> scene(s) across all chapters.</p>
                    <p>Estimated time to generate narratives for all scenes: <strong>{Math.ceil((totalParsedScenes * ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION) / 60)} minutes</strong>.</p>
                </div>
            )}

            {parsedBreakdowns && !isGeneratingBreakdowns && (
                <div style={{ marginTop: '20px' }}>
                    {Object.entries(parsedBreakdowns).map(([chapterTitle, scenes]) => (
                        <div key={chapterTitle} style={{ marginBottom: '30px' }}>
                            <h4>{chapterTitle}</h4>
                            <div className="markdown-content" style={{ 
                                border: '1px solid #444', 
                                padding: '15px', 
                                borderRadius: '5px',
                                backgroundColor: 'var(--input-bg-color, #2a2a2a)'
                            }}>
                                <ReactMarkdown>{sceneBreakdownsData?.[chapterTitle] || ''}</ReactMarkdown>
                            </div>
                            <h5>Parsed Scenes:</h5>
                            {scenes.length > 0 ? (
                                <ul className="parsed-scene-list">
                                    {scenes.map((scene, index) => (
                                        <li key={index} className="parsed-scene-item">
                                            <strong>{scene.sceneNumber || `Scene ${index + 1}`}</strong>
                                            {scene.goal && <p><strong>Goal:</strong> {scene.goal}</p>}
                                            {scene.keyEvents && <p><strong>Events:</strong> {scene.keyEvents}</p>}
                                            {scene.charactersPresent && <p><strong>Chars:</strong> {scene.charactersPresent}</p>}
                                            {scene.setting && <p><strong>Setting:</strong> {scene.setting}</p>}
                                            <button 
                                                onClick={() => onSelectSceneForWriting(chapterTitle, scene.sceneNumber || `ParsedScene ${index+1}`, scene.rawContent)}
                                                className="button-small button-write-scene"
                                                disabled={project.isLoading}
                                            >
                                                Write this Scene ➔
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p>No scenes parsed for this chapter. Check Markdown formatting.</p>}
                             <div className="markdown-content-raw" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px dashed #555', padding: '10px', marginTop:'10px' }}>
                                <h5>Raw Markdown for {chapterTitle} (for debugging parsing)</h5>
                                <pre style={{whiteSpace: 'pre-wrap', fontSize:'0.8em'}}>{sceneBreakdownsData?.[chapterTitle] || ''}</pre>
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