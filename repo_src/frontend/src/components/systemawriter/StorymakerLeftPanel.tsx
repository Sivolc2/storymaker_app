import React from 'react';
import { ProjectState, UploadedDocument, SceneNarrative } from '../../contexts/ProjectContext'; // Assuming types are exported

interface StorymakerLeftPanelProps {
    project: ProjectState | null;
    activeView: string; // To highlight the active artifact/view
    onSelectView: (view: string) => void;
    onRemoveDocument: (docId: string) => void;
    onAddDocumentClick: () => void; // To trigger file input in main component
    onEditArtifact: (artifactType: 'concept' | 'outline' | 'worldbuilding' | 'sceneBreakdowns' | UploadedDocument | SceneNarrative) => void;
}

const StorymakerLeftPanel: React.FC<StorymakerLeftPanelProps> = ({
    project,
    activeView,
    onSelectView,
    onRemoveDocument,
    onAddDocumentClick,
    onEditArtifact
}) => {
    if (!project) {
        return (
            <div className="left-panel">
                <p>No project loaded. Create or load one via "Project Setup".</p>
            </div>
        );
    }

    const artifactBaseClass = "left-panel-item";
    const activeClass = "active";

    const getArtifactStatus = (artifact: ProjectState['concept'] | ProjectState['outline'] | ProjectState['worldbuilding'] | ProjectState['sceneBreakdowns']) => {
        if (artifact.isApproved) return '✓';
        if (project?.isLoading && activeView === artifactTypeToView(artifact)) return '(Generating...)'; // Needs a way to map artifact to view
        if (artifact.content) return '(Draft)';
        return '';
    };

    // Helper to map artifact type to its view string, needed for isLoading check above.
    // This is a simplified version. A more robust solution might involve passing specific loading states.
    const artifactTypeToView = (artifact: any): string => {
        if (artifact === project?.concept) return 'concept';
        if (artifact === project?.outline) return 'outline';
        if (artifact === project?.worldbuilding) return 'worldbuilding';
        if (artifact === project?.sceneBreakdowns) return 'scene_breakdowns';
        return '';
    }

    return (
        <div className="left-panel">
            <h3>{project.projectName}</h3>
            {project.isLoading && <span className="global-loading-indicator">(Conjuring details...)</span>}
            <button 
                className={`${artifactBaseClass} ${activeView === 'project_setup' ? activeClass : ''}`} 
                onClick={() => onSelectView('project_setup')}
            >
                🌌 Project Sanctuary
            </button>
            <h4>Woven Artifacts</h4>
            <div className="artifact-list">
                <div 
                    className={`${artifactBaseClass} ${activeView === 'concept' ? activeClass : ''}`}
                    onClick={() => onSelectView('concept')}
                >
                    📝 Concept {getArtifactStatus(project.concept)}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('concept'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'outline' ? activeClass : ''}`}
                    onClick={() => onSelectView('outline')}
                >
                    📖 Outline {getArtifactStatus(project.outline)}
                     <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('outline'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'worldbuilding' ? activeClass : ''}`}
                    onClick={() => onSelectView('worldbuilding')}
                >
                    🌍 Worldbuilding {getArtifactStatus(project.worldbuilding)}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('worldbuilding'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'scene_breakdowns' ? activeClass : ''}`}
                    onClick={() => onSelectView('scene_breakdowns')}
                >
                    🎬 Scene Breakdowns {getArtifactStatus(project.sceneBreakdowns)}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('sceneBreakdowns'); }}>Edit</button>
                </div>
            </div>

            <h4>Gathered Scrolls</h4>
             <button onClick={onAddDocumentClick} className="add-doc-btn-small">Add Scroll +</button>
            <div className="document-list">
                {project.uploadedDocuments.map(doc => (
                    <div key={doc.id} className={`${artifactBaseClass} ${activeView === `doc_${doc.id}` ? activeClass : ''}`}>
                        <span>📄 {doc.name}</span>
                        <div>
                            <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact(doc); }}>View/Edit</button>
                            <button className="remove-btn-small" onClick={(e) => { e.stopPropagation(); onRemoveDocument(doc.id); }}>Remove</button>
                        </div>
                    </div>
                ))}
                {project.uploadedDocuments.length === 0 && <p className="empty-list-text">No scrolls gathered.</p>}
            </div>
            
            <h4>Whispers of Scenes ({project.sceneNarratives.length})</h4>
             <div className="artifact-list">
                {project.sceneNarratives.map(scene => (
                     <div 
                        key={`${scene.chapterTitle}-${scene.sceneIdentifier}`} 
                        className={`${artifactBaseClass} ${activeView === `scene_${scene.chapterTitle}_${scene.sceneIdentifier}` ? activeClass : ''}`}
                        onClick={() => onEditArtifact(scene)} // This will set view to scene_writing and prefill
                    >
                        <span>{scene.chapterTitle} - {scene.sceneIdentifier}</span>
                         <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact(scene); }}>Edit</button>
                    </div>
                ))}
                 {project.sceneNarratives.length === 0 && <p className="empty-list-text">No scenes yet whispered.</p>}
            </div>


            <button 
                className={`${artifactBaseClass} ${activeView === 'full_story_review' ? activeClass : ''} review-button`}
                onClick={() => onSelectView('full_story_review')}
            >
                📖 The Completed Tome
            </button>
        </div>
    );
};

export default StorymakerLeftPanel; 