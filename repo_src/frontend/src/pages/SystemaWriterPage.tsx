import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import ProjectSetupTab from '../components/systemawriter/ProjectSetupTab';
import ConceptTab from '../components/systemawriter/ConceptTab';
import OutlineTab from '../components/systemawriter/OutlineTab';
import WorldbuildingTab from '../components/systemawriter/WorldbuildingTab';
import SceneBreakdownTab from '../components/systemawriter/SceneBreakdownTab';
import SceneWritingTab from '../components/systemawriter/SceneWritingTab';
import FullStoryReviewTab from '../components/systemawriter/FullStoryReviewTab';
import StorymakerLeftPanel from '../components/systemawriter/StorymakerLeftPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import { UploadedDocument as UploadedDocumentType, SceneNarrative as SceneNarrativeType } from '../contexts/ProjectContext';
import DocumentEditor from '../components/systemawriter/DocumentEditor';

import '../styles/Storymaker.css';
import '../styles/StorymakeTabs.css';
import '../styles/StorymakerLayout.css'; // New layout styles

type StorymakerView =
    | 'project_setup' 
    | 'concept' 
    | 'outline' 
    | 'worldbuilding' 
    | 'scene_breakdowns' 
    | 'scene_writing'
    | 'full_story_review'
    | `doc_${string}` // For viewing/editing uploaded documents
    | `scene_${string}_${string}`; // For editing specific scenes

type MainStorymakerArtifactType = 'concept' | 'outline' | 'worldbuilding' | 'sceneBreakdowns';

interface SystemaWriterPageProps {
    apiUrl: string;
}

const SystemaWriterPage: React.FC<SystemaWriterPageProps> = ({ apiUrl }) => {
    const { project, removeUploadedDocument, addUploadedDocument, updateUploadedDocumentContent, updateArtifact } = useProject();
    const [activeView, setActiveView] = useState<StorymakerView>(project ? 'concept' : 'project_setup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    
    const [editingSceneDetails, setEditingSceneDetails] = useState<{chapterTitle: string, sceneIdentifier: string, scenePlan?: string} | null>(null);

    // For Guide 6: Document Editor
    const [editingDocument, setEditingDocument] = useState<UploadedDocumentType | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!project) {
            setActiveView('project_setup');
        }
    }, [project]);
    
    const handleSelectView = (view: StorymakerView) => {
        setError(null); // Clear errors when changing views
        setActiveView(view);
    };
    
    const handleEditArtifact = (
        artifactSource: MainStorymakerArtifactType | UploadedDocumentType | SceneNarrativeType
    ) => {
        setEditingDocument(null); // Close document editor if open
    
        if (typeof artifactSource === 'string') {
            // Main artifacts: concept, outline, worldbuilding, sceneBreakdowns
            const artifactName = artifactSource as MainStorymakerArtifactType;
            
            if (project && project[artifactName]) {
                // Set the artifact to not approved, keeping its current content.
                // This will trigger the useEffect in the respective tab to allow editing.
                updateArtifact(artifactName, project[artifactName].content, false);
                
                const viewMap: Record<MainStorymakerArtifactType, StorymakerView> = {
                    'concept': 'concept', 'outline': 'outline',
                    'worldbuilding': 'worldbuilding', 'sceneBreakdowns': 'scene_breakdowns'
                };
                setActiveView(viewMap[artifactName] || artifactName as StorymakerView);
            }
        } else if ('content' in artifactSource && 'type' in artifactSource && 'id' in artifactSource) { // UploadedDocument
            setEditingDocument(artifactSource);
            // Document editor will overlay current view
        } else if ('sceneIdentifier' in artifactSource) { // SceneNarrativeType
            setEditingSceneDetails({ chapterTitle: artifactSource.chapterTitle, sceneIdentifier: artifactSource.sceneIdentifier });
            setActiveView('scene_writing');
        }
    };

    const handleAddDocumentClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !project) return;
        setIsLoading(true);
        setError(null);

        for (const file of Array.from(files)) {
            try {
                const content = await readFileAsText(file);
                addUploadedDocument({
                    id: Date.now().toString() + Math.random().toString(), // Simple unique ID
                    name: file.name,
                    content: content,
                    type: file.type,
                });
            } catch (err: any) {
                setError(`Failed to read file ${file.name}: ${err.message}`);
            }
        }
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    };

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    // For Guide 5: Scene selection from Breakdown tab
    const handleSelectSceneForWriting = (chapterTitle: string, sceneIdentifier: string, scenePlan: string) => {
        setEditingSceneDetails({ chapterTitle, sceneIdentifier, scenePlan }); // Pass scenePlan too
        setActiveView('scene_writing');
        setEditingDocument(null); // Close doc editor if open
    };

    const handleSaveEditedDocument = (docId: string, newContent: string) => {
        updateUploadedDocumentContent(docId, newContent);
        setEditingDocument(null);
        setError(null); // Clear any previous errors
        // Optionally, set a success message here
    };

    const handleCancelEditDocument = () => {
        setEditingDocument(null);
    };

    const renderMainContent = () => {
        // Guide 6: If a document is being edited, show the editor
        if (editingDocument) {
            return (
                <DocumentEditor document={editingDocument} onSave={handleSaveEditedDocument} onCancel={handleCancelEditDocument} />
            );
        }

        if (!project && activeView !== 'project_setup') {
             return <p>Please set up your project first.</p>;
        }

        switch (activeView) {
            case 'project_setup':
                return <ProjectSetupTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onProjectCreated={() => setActiveView('concept')} />;
            case 'concept':
                return <ConceptTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onConceptApproved={() => {}} />;
            case 'outline':
                return <OutlineTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onOutlineApproved={() => {}} />;
            case 'worldbuilding':
                return <WorldbuildingTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onWorldbuildingApproved={() => {}} />;
            case 'scene_breakdowns':
                return <SceneBreakdownTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} onSelectSceneForWriting={handleSelectSceneForWriting} />;
            case 'scene_writing':
                return <SceneWritingTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
            case 'full_story_review':
                return <FullStoryReviewTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} />;
            default:
                return <p>Unknown view: {activeView}</p>;
        }
    };
    
    // Top navigation bar (replaces old tabs)
    const navItems: {label: string, view: StorymakerView, prerequisite?: (p: typeof project) => boolean, prereqMessage?: string}[] = [
        { label: "🌌 Project Sanctuary", view: 'project_setup' },
        { 
            label: "✨ Spark of Idea (Concept)", 
            view: 'concept', 
            prerequisite: p => !!p 
        },
        { 
            label: "📜 Unfurling the Scroll (Outline)", 
            view: 'outline', 
            prerequisite: p => !!p, // Changed: Only project needs to exist
            prereqMessage: "A project must exist to weave an Outline."
        },
        { 
            label: "🌍 Whispers of the World (Worldbuilding)", 
            view: 'worldbuilding', 
            prerequisite: p => !!p, // Changed: Only project needs to exist
            prereqMessage: "A project must exist to dream a World."
        },
        { 
            label: "🎞️ Threads of Fate (Scene Breakdowns)", 
            view: 'scene_breakdowns', 
            prerequisite: p => !!p && !!p.outline.content && !!p.worldbuilding.content, 
            prereqMessage: "An Outline and Worldbuilding are needed to lay the Scene Breakdowns."
        },
        { 
            label: "🖋️ Scribing the Scenes", 
            view: 'scene_writing', 
            prerequisite: p => !!p && !!p.sceneBreakdowns.content, 
            prereqMessage: "Scene Breakdowns are needed before Scribing Scenes."
        },
        { 
            label: "📖 The Completed Tome (Review & Export)", 
            view: 'full_story_review', 
            prerequisite: p => !!p && (!!p.sceneBreakdowns.content || p.sceneNarratives.length > 0), 
            prereqMessage: "Weave some parts of your story first." 
        }
    ];

    return (
        <div className="storymaker-container page-container">
            <h1>Storymaker ~ Weave Your Worlds</h1>
            {isLoading && <LoadingSpinner />}
            {error && <p className="error-message">Error: {error}</p>}
            
            <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} accept=".txt,.md" style={{ display: 'none' }} />
            <div className="storymaker-page-layout">
                <div className={`left-panel ${isLeftPanelCollapsed ? 'collapsed' : ''}`}>
                    <div className="collapse-btn-container">
                        <button onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)} className="collapse-btn">
                            {isLeftPanelCollapsed ? '»' : '«'}
                        </button>
                    </div>
                    {!isLeftPanelCollapsed && project && (
                        <StorymakerLeftPanel
                            project={project}
                            activeView={activeView}
                            onSelectView={(view) => handleSelectView(view as StorymakerView)}
                            onRemoveDocument={removeUploadedDocument}
                            onAddDocumentClick={handleAddDocumentClick}
                            onEditArtifact={handleEditArtifact}
                        />
                    )}
                     {!isLeftPanelCollapsed && !project && (
                        <p>Create a new project or load an existing one to get started.</p>
                    )}
                </div>
                <div className="main-content-area">
                    <nav className="sw-tabs-nav">
                        {navItems.map(item => (
                            <button
                                key={item.view}
                                onClick={() => {
                                    setEditingDocument(null); // Close document editor when changing main tabs
                                    const isPrereqMet = !item.prerequisite || (project && item.prerequisite(project));
                                    if (!isPrereqMet) {
                                        setError(item.prereqMessage || "A previous step must be completed.");
                                    } else if (!project && item.view !== 'project_setup') {
                                         setError("Please create or load a project first.");
                                    } else {
                                        handleSelectView(item.view as StorymakerView);
                                    }
                                }}
                                className={`sw-tab-button ${activeView === item.view ? 'active' : ''}`}
                                disabled={(!project && item.view !== 'project_setup') || (item.prerequisite && project && !item.prerequisite(project)) || false}
                                title={ (item.prerequisite && project && !item.prerequisite(project)) ? item.prereqMessage : '' }
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div className="sw-tab-content-wrapper">
                        {renderMainContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemaWriterPage; 