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
import PrerequisiteWarningModal from '../components/systemawriter/PrerequisiteWarningModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { UploadedDocument as UploadedDocumentType, SceneNarrative as SceneNarrativeType } from '../contexts/ProjectContext';

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

interface SystemaWriterPageProps {
    apiUrl: string;
}

const SystemaWriterPage: React.FC<SystemaWriterPageProps> = ({ apiUrl }) => {
    const { project, removeUploadedDocument, addUploadedDocument } = useProject();
    const [activeView, setActiveView] = useState<StorymakerView>('project_setup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Warning Modal State
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [onConfirmWarning, setOnConfirmWarning] = useState<(() => void) | null>(null);
    
    const [editingSceneDetails, setEditingSceneDetails] = useState<{chapterTitle: string, sceneIdentifier: string} | null>(null);


    useEffect(() => {
        if (!project) {
            setActiveView('project_setup');
        }
    }, [project]);
    
    const handleSelectView = (view: StorymakerView) => {
        setError(null); // Clear errors when changing views
        setActiveView(view);
    };
    
    const handleEditArtifact = (artifact: 'concept' | 'outline' | 'worldbuilding' | 'sceneBreakdowns' | UploadedDocumentType | SceneNarrativeType) => {
        if (typeof artifact === 'string') {
            // Map artifact names to view names
            const viewMap: Record<string, StorymakerView> = {
                'concept': 'concept',
                'outline': 'outline', 
                'worldbuilding': 'worldbuilding',
                'sceneBreakdowns': 'scene_breakdowns'
            };
            setActiveView(viewMap[artifact] || artifact as StorymakerView);
        } else if ('content' in artifact && 'type' in artifact) { // UploadedDocument
            // For now, no specific edit view for uploaded docs, could show preview
            console.log("Viewing/editing uploaded document:", artifact.name);
            // setActiveView(`doc_${artifact.id}`); // If we had a viewer
        } else if ('sceneIdentifier' in artifact) { // SceneNarrative
            setEditingSceneDetails({ chapterTitle: artifact.chapterTitle, sceneIdentifier: artifact.sceneIdentifier });
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

    const showPrerequisiteWarning = (message: string, onConfirm: () => void) => {
        setWarningMessage(message);
        setOnConfirmWarning(() => onConfirm); // Store the confirm action
        setIsWarningModalOpen(true);
    };

    const closeWarningModal = () => {
        setIsWarningModalOpen(false);
        setWarningMessage('');
        setOnConfirmWarning(null);
    };

    const handleConfirmWarning = () => {
        if (onConfirmWarning) {
            onConfirmWarning();
        }
        closeWarningModal();
    };

    const renderMainContent = () => {
        if (!project && activeView !== 'project_setup') {
             return <p>Please set up your project first.</p>;
        }
        switch (activeView) {
            case 'project_setup':
                return <ProjectSetupTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onProjectCreated={() => setActiveView('concept')} />;
            case 'concept':
                return <ConceptTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onConceptApproved={() => { /* User navigates manually */ }} />;
            case 'outline':
                return <OutlineTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onOutlineApproved={() => {}} showPrerequisiteWarning={showPrerequisiteWarning} />;
            case 'worldbuilding':
                return <WorldbuildingTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onWorldbuildingApproved={() => {}} showPrerequisiteWarning={showPrerequisiteWarning} />;
            case 'scene_breakdowns':
                return <SceneBreakdownTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} showPrerequisiteWarning={showPrerequisiteWarning} />;
            case 'scene_writing':
                return <SceneWritingTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} showPrerequisiteWarning={showPrerequisiteWarning} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
            case 'full_story_review':
                return <FullStoryReviewTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} />;
            default:
                if (activeView.startsWith('doc_')) {
                    // const docId = activeView.substring(4);
                    // const doc = project?.uploadedDocuments.find(d => d.id === docId);
                    // return doc ? <div><h3>{doc.name}</h3><pre>{doc.content}</pre></div> : <p>Document not found.</p>;
                     return <p>Document viewer/editor not yet implemented. Select an action from the main tabs.</p>;
                }
                 return <p>Select an item from the left panel or a tab from above.</p>;
        }
    };
    
    // Top navigation bar (replaces old tabs)
    const navItems: {label: string, view: StorymakerView, prerequisite?: (p: typeof project) => boolean, prereqMessage?: string}[] = [
        { label: "Project Setup", view: 'project_setup' },
        { label: "1. Concept", view: 'concept', prerequisite: p => !!p },
        { label: "2. Outline", view: 'outline', prerequisite: p => !!p && !!p.concept.content, prereqMessage: "Concept needed for Outline."},
        { label: "3. Worldbuilding", view: 'worldbuilding', prerequisite: p => !!p && !!p.outline.content, prereqMessage: "Outline needed for Worldbuilding."},
        { label: "4. Scene Breakdowns", view: 'scene_breakdowns', prerequisite: p => !!p && !!p.worldbuilding.content, prereqMessage: "Worldbuilding needed for Scene Breakdowns."},
        { label: "5. Scene Writing", view: 'scene_writing', prerequisite: p => !!p && !!p.sceneBreakdowns.content, prereqMessage: "Scene Breakdowns needed for Scene Writing."},
        { label: "6. Review & Export", view: 'full_story_review', prerequisite: p => !!p && (!!p.sceneBreakdowns.content || p.sceneNarratives.length > 0), prereqMessage: "Generate some content first." }
    ];


    return (
        <div className="storymaker-container page-container">
            <h1>Storymaker</h1>
            {isLoading && <LoadingSpinner />}
            {error && <p className="error-message">Error: {error}</p>}
            
            <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} accept=".txt,.md" style={{ display: 'none' }} />

            <div className="sw-tabs-nav">
                {navItems.map(item => (
                    <button
                        key={item.view}
                        onClick={() => {
                            if (item.prerequisite && project && !item.prerequisite(project)) {
                                showPrerequisiteWarning(
                                    item.prereqMessage || `Prerequisite for ${item.label} not met.`,
                                    () => handleSelectView(item.view as StorymakerView)
                                );
                            } else if (!project && item.view !== 'project_setup') {
                                setError("Please create or load a project first.");
                            }
                            else {
                                handleSelectView(item.view as StorymakerView);
                            }
                        }}
                        className={activeView === item.view ? 'active' : ''}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

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
                    {renderMainContent()}
                </div>
            </div>

            <PrerequisiteWarningModal
                isOpen={isWarningModalOpen}
                message={warningMessage}
                onConfirm={handleConfirmWarning}
                onCancel={closeWarningModal}
            />
        </div>
    );
};

export default SystemaWriterPage; 