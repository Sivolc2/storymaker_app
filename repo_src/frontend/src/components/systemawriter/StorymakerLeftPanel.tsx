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

    return (
        <div className="left-panel">
            <h3>{project.projectName}</h3>
            <button 
                className={`${artifactBaseClass} ${activeView === 'project_setup' ? activeClass : ''}`} 
                onClick={() => onSelectView('project_setup')}
            >
                ⚙️ Project Setup
            </button>

            <h4>Generated Artifacts</h4>
            <div className="artifact-list">
                <div 
                    className={`${artifactBaseClass} ${activeView === 'concept' ? activeClass : ''}`}
                    onClick={() => onSelectView('concept')}
                >
                    📝 Concept {project.concept.isApproved && '✓'}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('concept'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'outline' ? activeClass : ''}`}
                    onClick={() => onSelectView('outline')}
                >
                    📖 Outline {project.outline.isApproved && '✓'}
                     <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('outline'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'worldbuilding' ? activeClass : ''}`}
                    onClick={() => onSelectView('worldbuilding')}
                >
                    🌍 Worldbuilding {project.worldbuilding.isApproved && '✓'}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('worldbuilding'); }}>Edit</button>
                </div>
                <div
                    className={`${artifactBaseClass} ${activeView === 'scene_breakdowns' ? activeClass : ''}`}
                    onClick={() => onSelectView('scene_breakdowns')}
                >
                    🎬 Scene Breakdowns {project.sceneBreakdowns.isApproved && '✓'}
                    <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('sceneBreakdowns'); }}>Edit</button>
                </div>
            </div>

            <h4>Uploaded Documents</h4>
             <button onClick={onAddDocumentClick} className="add-doc-btn-small">Add Document +</button>
            <div className="document-list">
                {project.uploadedDocuments.map(doc => (
                    <div key={doc.id} className={`${artifactBaseClass} ${activeView === `doc_${doc.id}` ? activeClass : ''}`}>
                        <span>📄 {doc.name}</span>
                        <div>
                            {/* <button className="edit-btn-small" onClick={() => onEditArtifact(doc)}>View/Edit</button> */}
                            <button className="remove-btn-small" onClick={() => onRemoveDocument(doc.id)}>Remove</button>
                        </div>
                    </div>
                ))}
                {project.uploadedDocuments.length === 0 && <p className="empty-list-text">No documents uploaded.</p>}
            </div>
            
            <h4>Scene Narratives ({project.sceneNarratives.length})</h4>
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
                 {project.sceneNarratives.length === 0 && <p className="empty-list-text">No scenes written yet.</p>}
            </div>


            <button 
                className={`${artifactBaseClass} ${activeView === 'full_story_review' ? activeClass : ''} review-button`}
                onClick={() => onSelectView('full_story_review')}
            >
                📚 Full Story Review & Export
            </button>
        </div>
    );
};

export default StorymakerLeftPanel; 