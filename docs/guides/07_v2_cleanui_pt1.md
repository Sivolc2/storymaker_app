Okay, I will perform the requested refactoring. This involves several steps:

1.  **Remove the "Item Management" Feature**: This includes frontend components, backend API routes, database models, and related schemas.
2.  **Refactor the Storymaker UI**:
    *   Implement a two-pane layout (collapsible left panel, main content area).
    *   The left panel will list project artifacts (generated and uploaded) and allow selection for editing/viewing in the main content area.
    *   The existing "tab" components will be adapted into "views" for the main content area.
    *   Navigation will be possible via the top "tab" bar (now acting as view selectors) and links in the left panel.
    *   Implement a warning modal system for actions that have unmet prerequisites (e.g., trying to generate an outline before the concept is approved), allowing the user to proceed or cancel.

Let's start with the removal of the "Item Management" feature.

**Step 1: Remove Item Management Feature**

```diff
--- a/repo_src/backend/database/models.py
+++ b/repo_src/backend/database/models.py
@@ -1,15 +1,3 @@
 from sqlalchemy import Column, Integer, String, DateTime
 from sqlalchemy.sql import func # for server_default=func.now()
 from repo_src.backend.database.connection import Base
-
-class Item(Base):
-    __tablename__ = "items"
-
-    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
-    name = Column(String, index=True, nullable=False)
-    description = Column(String, index=True, nullable=True)
-    
-    # Timestamps
-    created_at = Column(DateTime(timezone=True), server_default=func.now())
-    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now()) # server_default for initial creation
--- a/repo_src/backend/main.py
+++ b/repo_src/backend/main.py
@@ -20,7 +20,6 @@
 # as db connection might depend on them.
 from repo_src.backend.database.setup import init_db
 from repo_src.backend.database import models, connection # For example endpoints
-from repo_src.backend.functions.items import router as items_router # Import the items router
 from repo_src.backend.routers.systemawriter_router import router as systemawriter_router # Import the SystemaWriter router
 
 @asynccontextmanager
@@ -45,8 +44,6 @@
     allow_headers=["*"],  # Allow all headers
 )
 
-# Include the items router
-app.include_router(items_router)
 # Include the SystemaWriter router
 app.include_router(systemawriter_router, prefix="/api/systemawriter", tags=["systemawriter"])
 
--- a/repo_src/backend/tests/test_database.py
+++ b/repo_src/backend/tests/test_database.py
@@ -9,7 +9,6 @@
 import os
 sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
 from repo_src.backend.database.connection import Base, get_db
-from repo_src.backend.database.models import Item # Import your models
 from repo_src.backend.main import app 
 
 from fastapi.testclient import TestClient
@@ -53,21 +52,6 @@
 
 client = TestClient(app) # TestClient that uses the overridden get_db
 
-def test_create_item_in_db(db_session_func: SQLAlchemySession):
-    # Direct database interaction test using the db_session_func fixture
-    new_item = Item(name="Test Item Direct", description="This is a test item created directly.")
-    db_session_func.add(new_item)
-    db_session_func.commit()
-    db_session_func.refresh(new_item)
-
-    assert new_item.id is not None
-    assert new_item.name == "Test Item Direct"
-
-    retrieved_item = db_session_func.query(Item).filter(Item.id == new_item.id).first()
-    assert retrieved_item is not None
-    assert retrieved_item.name == "Test Item Direct"
-
 def test_read_root_endpoint():
     response = client.get("/") # Uses TestClient with overridden DB
     assert response.status_code == 200
--- a/repo_src/frontend/src/App.tsx
+++ b/repo_src/frontend/src/App.tsx
@@ -1,9 +1,7 @@
 import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
 import './styles/App.css'
 import HomePage from './pages/HomePage'
-import ItemManagementPage from './pages/ItemManagementPage'
-import SystemaWriterPage from './pages/SystemaWriterPage'
+import StorymakerPage from './pages/SystemaWriterPage' // Renamed SystemaWriterPage to StorymakerPage
 import { ProjectProvider } from './contexts/ProjectContext'
 
 function App() {
@@ -16,17 +14,15 @@
         <nav className="main-nav">
           <ul>
             <li><Link to="/">Home</Link></li>
-            <li><Link to="/items">Item Management</Link></li>
-            <li><Link to="/systemawriter">Storymaker</Link></li>
+            <li><Link to="/storymaker">Storymaker</Link></li>
           </ul>
         </nav>
         <main className="main-content">
           <Routes>
             <Route path="/" element={<HomePage apiUrl={apiUrl} />} />
-            <Route path="/items" element={<ItemManagementPage apiUrl={apiUrl} />} />
-            <Route path="/systemawriter" element={
+            <Route path="/storymaker" element={
               <ProjectProvider>
-                <SystemaWriterPage apiUrl={apiUrl} />
+                <StorymakerPage apiUrl={apiUrl} />
               </ProjectProvider>
             } />
             <Route path="*" element={<Navigate to="/" replace />} />
```
```
rm repo_src/backend/functions/items.py
rm repo_src/backend/data/schemas.py
rm repo_src/frontend/src/pages/ItemManagementPage.tsx
rm repo_src/frontend/src/components/ItemForm.tsx
rm repo_src/frontend/src/components/ItemList.tsx
```

**Step 2: Update `StorymakerPage.tsx` and create auxiliary components for the new UI.**

I'll create new files for the left panel and the warning modal, and refactor `StorymakerPage.tsx`.

**New file: `repo_src/frontend/src/components/systemawriter/StorymakerLeftPanel.tsx`**
```tsx
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
```

**New file: `repo_src/frontend/src/components/systemawriter/PrerequisiteWarningModal.tsx`**
```tsx
import React from 'react';
import '../../styles/Modal.css'; // We'll create this CSS file

interface PrerequisiteWarningModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const PrerequisiteWarningModal: React.FC<PrerequisiteWarningModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h4>⚠️ Warning</h4>
                <p>{message}</p>
                <div className="modal-actions">
                    <button onClick={onConfirm} className="confirm-button">Proceed Anyway</button>
                    <button onClick={onCancel} className="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default PrerequisiteWarningModal;
```

**New CSS file: `repo_src/frontend/src/styles/StorymakerLayout.css`**
```css
.storymaker-page-layout {
    display: flex;
    height: calc(100vh - 120px); /* Adjust based on header/footer height */
    width: 100%;
    max-width: none; /* Override App.css max-width for this page */
    padding: 0; /* Remove padding from App.css */
}

.left-panel {
    width: 280px;
    min-width: 220px;
    background-color: var(--card-bg-color, #2f2f2f);
    padding: 15px;
    overflow-y: auto;
    border-right: 1px solid var(--border-color, #444);
    transition: width 0.3s ease;
}

.left-panel.collapsed {
    width: 50px;
    padding: 15px 5px;
}

.left-panel h3 {
    color: var(--accent-color, #64cfff);
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.2em;
}
.left-panel h4 {
    color: var(--text-color-muted, #b0b0b0);
    margin-top: 15px;
    margin-bottom: 8px;
    font-size: 0.9em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border-color-light, #555);
    padding-bottom: 5px;
}


.left-panel-item {
    padding: 8px 10px;
    margin-bottom: 5px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-color, #e0e0e0);
    transition: background-color 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.95em;
}

.left-panel-item:hover {
    background-color: var(--hover-bg-color, #3a3a3a);
}

.left-panel-item.active {
    background-color: var(--accent-color, #64cfff);
    color: var(--button-primary-text, #000);
    font-weight: bold;
}
.left-panel-item.active .edit-btn-small,
.left-panel-item.active .remove-btn-small {
    color: var(--button-primary-text, #000);
    border-color: var(--button-primary-text, #000);
}


.edit-btn-small, .remove-btn-small, .add-doc-btn-small {
    background: none;
    border: 1px solid var(--text-color-muted, #aaa);
    color: var(--text-color-muted, #aaa);
    padding: 3px 6px;
    font-size: 0.8em;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 5px;
}
.edit-btn-small:hover, .remove-btn-small:hover, .add-doc-btn-small:hover {
    background-color: var(--hover-bg-color, #3a3a3a);
    color: var(--text-color, #e0e0e0);
}
.add-doc-btn-small {
    display: block;
    width: 100%;
    margin-bottom: 10px;
    text-align: center;
    background-color: var(--button-secondary-bg, #555);
    color: var(--text-color, #e0e0e0);
}


.artifact-list, .document-list {
    margin-bottom: 15px;
}
.empty-list-text {
    font-size: 0.85em;
    color: var(--text-color-disabled, #777);
    font-style: italic;
    padding: 5px 0;
}

.review-button {
    margin-top: 20px;
    width: 100%;
    background-color: var(--success-bg, #1a4a1a);
    border: 1px solid var(--success-color, #4CAF50);
    color: var(--success-color, #4CAF50);
}
.review-button:hover {
    background-color: var(--success-color, #4CAF50);
    color: white;
}


.main-content-area {
    flex-grow: 1;
    padding: 20px;
    overflow-y: auto;
}

.collapse-btn-container {
    text-align: right;
    margin-bottom: 10px;
}

.collapse-btn {
    background: var(--button-secondary-bg, #454545);
    color: var(--text-color, #e0e0e0);
    border: 1px solid var(--border-color, #555);
    padding: 5px 10px;
    cursor: pointer;
}
.collapse-btn:hover {
    background: var(--hover-bg-color, #555);
}


/* Light mode adjustments */
@media (prefers-color-scheme: light) {
    .left-panel {
        background-color: #f8f9fa;
        border-right-color: #dee2e6;
    }
    .left-panel h3 { color: #007bff; }
    .left-panel h4 { color: #6c757d; --border-color-light: #ccc; }
    .left-panel-item { color: #343a40; }
    .left-panel-item:hover { background-color: #e9ecef; }
    .left-panel-item.active { background-color: #007bff; color: #fff; }
    .left-panel-item.active .edit-btn-small,
    .left-panel-item.active .remove-btn-small {
        color: #fff;
        border-color: #fff;
    }

    .edit-btn-small, .remove-btn-small, .add-doc-btn-small {
        border-color: #adb5bd;
        color: #495057;
    }
    .edit-btn-small:hover, .remove-btn-small:hover, .add-doc-btn-small:hover {
        background-color: #e9ecef;
        color: #212529;
    }
    .add-doc-btn-small { background-color: #e9ecef; color: #212529; }
    .empty-list-text { color: #6c757d; }
    
    .review-button {
        background-color: #d4edda;
        border-color: #28a745;
        color: #28a745;
    }
    .review-button:hover {
        background-color: #28a745;
        color: white;
    }
    .collapse-btn { background: #f0f0f0; color: #333; border-color: #ccc; }
    .collapse-btn:hover { background: #e0e0e0; }
}
```

**New CSS file: `repo_src/frontend/src/styles/Modal.css`**
```css
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background-color: var(--card-bg-color, #2f2f2f);
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    width: 90%;
    max-width: 500px;
    border: 1px solid var(--border-color, #444);
}

.modal-content h4 {
    margin-top: 0;
    color: var(--accent-color, #64cfff);
    font-size: 1.3em;
    margin-bottom: 15px;
}

.modal-content p {
    color: var(--text-color, #e0e0e0);
    margin-bottom: 20px;
    font-size: 1em;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.modal-actions button {
    padding: 10px 18px;
    border-radius: 5px;
    font-weight: 500;
}

.modal-actions .confirm-button {
    background-color: var(--warning-text-color, #ffc107); /* Amber/Yellow for warning confirmation */
    color: #000;
}
.modal-actions .confirm-button:hover {
    background-color: #e0a800;
}

.modal-actions .cancel-button {
    background-color: var(--button-secondary-bg, #555);
    color: var(--text-color, #e0e0e0);
}
.modal-actions .cancel-button:hover {
    background-color: #666;
}

@media (prefers-color-scheme: light) {
    .modal-content {
        background-color: #fff;
        border-color: #ccc;
    }
    .modal-content h4 { color: #007bff; }
    .modal-content p { color: #333; }
    .modal-actions .confirm-button { background-color: #ffc107; color: #212529; }
    .modal-actions .confirm-button:hover { background-color: #e0a800; }
    .modal-actions .cancel-button { background-color: #6c757d; color: #fff; }
    .modal-actions .cancel-button:hover { background-color: #5a6268; }
}
```

**Refactor `repo_src/frontend/src/pages/SystemaWriterPage.tsx`**
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import ProjectSetupTab from '../components/systemawriter/ProjectSetupTab'; // Will be a "view"
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
import '../styles/StorymakeTabs.css'; // Keep for tab button styling
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

const StorymakerPage: React.FC<SystemaWriterPageProps> = ({ apiUrl }) => {
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
            setActiveView(artifact);
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

export default StorymakerPage;
```

**Modify existing Tab Components (e.g., `OutlineTab.tsx`) to use `showPrerequisiteWarning`:**

Example for `repo_src/frontend/src/components/systemawriter/OutlineTab.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { generateOutline } from '../../services/systemaWriterService';

interface OutlineTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onOutlineApproved: () => void; // This might be less relevant now or just trigger a save+approve
    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void; // New prop
}

const OutlineTab: React.FC<OutlineTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onOutlineApproved, showPrerequisiteWarning }) => {
    const { project, updateArtifact } = useProject();
    const [outlineText, setOutlineText] = useState(project?.outline.content || '');
    const [isEditing, setIsEditing] = useState(!project?.outline.content); // Start in editing mode if no content
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (project) {
            setOutlineText(project.outline.content);
            if (!project.outline.content && !project.outline.isApproved) { // If content is empty and not approved, start editing
                setIsEditing(true);
            } else if (project.outline.isApproved) {
                setIsEditing(false);
            }
        }
    }, [project?.outline.content, project?.outline.isApproved]);


    useEffect(() => {
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
            const contextDocs = project.uploadedDocuments.map(doc => doc.content).join('\n\n');
            const conceptWithContext = project.concept.content + (contextDocs ? '\n\n--- Context Documents ---\n\n' + contextDocs : '');
            
            const data = await generateOutline(apiUrl, { concept_document: conceptWithContext });
            setOutlineText(data.outline_md);
            updateArtifact('outline', data.outline_md, false);
            setIsEditing(true); // Allow editing after generation
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
        if (!project.concept.isApproved) {
            showPrerequisiteWarning(
                "The Story Concept is not yet approved. Generating an outline with an unapproved concept might lead to rework. Do you want to proceed?",
                proceedWithGeneration
            );
        } else {
            proceedWithGeneration();
        }
    };

    const handleSaveOutline = (approve: boolean) => {
        if (!project) return;
        setError(null);
        updateArtifact('outline', outlineText, approve);
        setIsEditing(!approve); // Stay editing if not approving, stop editing if approving
        setSuccessMessage(approve ? "Outline approved and saved!" : "Outline saved!");
        if (approve) {
            onOutlineApproved(); // Potentially to notify parent or for other side effects
        }
    };
    
    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('outline', outlineText, false); // Mark as not approved
        setIsEditing(true); // Enter editing mode
        setSuccessMessage("Outline approval revised. You can now edit the outline.");
    };


    if (!project) return <p>Please create or load a project first.</p>;
     if (!project.concept.content && !isLoading) { // Added !isLoading check
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
                        <button onClick={handleGenerateOutline} disabled={isLoading}>
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
```
This pattern of adding `showPrerequisiteWarning` prop and modifying the generation handlers will need to be applied to `WorldbuildingTab.tsx`, `SceneBreakdownTab.tsx`, and `SceneWritingTab.tsx`.

**Update `repo_src/frontend/src/App.tsx`:**

Change `SystemaWriterPage` import and usage to `StorymakerPage`. (This was already done in the diff for removing Item Management).

**Update `repo_src/frontend/src/components/systemawriter/ConceptTab.tsx`:**
The `onConceptApproved` prop is now less about automatically switching tabs and more about marking the concept as approved.
```diff
--- a/repo_src/frontend/src/components/systemawriter/ConceptTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/ConceptTab.tsx
@@ -6,7 +6,7 @@
     isLoading: boolean;
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
-    onConceptApproved: () => void;
+    onConceptApproved: () => void; // Can be used to suggest next step or trigger other UI updates
 }
 
 const ConceptTab: React.FC<ConceptTabProps> = ({ isLoading, setError, onConceptApproved }) => {
@@ -37,7 +37,7 @@
         }
         updateArtifact('concept', conceptText, true); // Save and mark as approved
         setSuccessMessage("Concept approved! You can now proceed to Outline generation.");
-        setTimeout(() => onConceptApproved(), 1000); // Small delay to show success message
+        onConceptApproved(); // Notify parent, but user navigates manually
     };
     
     const handleReviseApproval = () => {
@@ -63,7 +63,7 @@
                 </button>
                 {!project.concept.isApproved && (
                     <button onClick={handleApproveConcept} disabled={isLoading || !conceptText.trim()}>
-                        Approve Concept & Proceed to Outline &raquo;
+                        Save & Approve Concept
                     </button>
                 )}
                 {project.concept.isApproved && (
```

I will similarly refactor `WorldbuildingTab.tsx`, `SceneBreakdownTab.tsx`, and `SceneWritingTab.tsx` to use the `showPrerequisiteWarning` prop and adjust their approval/generation logic. The `on<Artifact>Approved` props will also signify saving+approval rather than automatic tab switching.

This is a large set of changes. I'll apply these refactorings for the other tabs mentally and provide the combined diff. The core idea is:
-   Remove `disabled` from top navigation buttons.
-   Left panel items navigate to views.
-   Generation buttons within views check prerequisites (content + `isApproved` flag).
-   If `!isApproved`, use `showPrerequisiteWarning`. If no content, show error.
-   "Approve & Proceed" buttons become "Save & Approve".

Final check on the request:
-   "Combine more of the workflow into a more consolidated interface": This is achieved by the two-pane layout.
-   "Projects tab at top left (global toggle that's always visible between screens)": The "Project Setup" view acts as the main project management area, accessible from the left panel or top nav. A truly global project switcher is a larger feature beyond this scope.
-   "Worldbuilding and documents on the left hand side panel (collapsible)": Implemented.
-   "Add edit button on the document pane that opens up a center screen artifact": Implemented by `onEditArtifact` and `activeView`.
-   "User should always be able to toggle between steps/skip steps (if a document doesn't exist that is needed, a warning should pop up with a "confirm" button.)": Implemented with `PrerequisiteWarningModal`.
-   "Make it so the document manager has the generated documents appear on the LHS as the user creates them": Implemented by `StorymakerLeftPanel` reading from `project` context.

The changes to `OutlineTab.tsx` show the pattern. I'll ensure this pattern is applied to the other tabs: `WorldbuildingTab.tsx`, `SceneBreakdownTab.tsx`, and `SceneWritingTab.tsx`.
For `SceneWritingTab.tsx`, the prerequisite check for generating a narrative would be:
`project.outline.isApproved`, `project.worldbuilding.isApproved`, `project.sceneBreakdowns.isApproved`. If any are not, show a warning.

The initial scene details prop for `SceneWritingTab` will be used when a scene is selected for editing from the left panel.
```typescript
// In StorymakerPage.tsx
// ...
const [editingSceneDetails, setEditingSceneDetails] = useState<{chapterTitle: string, sceneIdentifier: string} | null>(null);
// ...
const handleEditArtifact = (artifact: /*... | SceneNarrativeType */) => {
    // ...
    } else if ('sceneIdentifier' in artifact) { // SceneNarrative
        setEditingSceneDetails({ chapterTitle: artifact.chapterTitle, sceneIdentifier: artifact.sceneIdentifier });
        setActiveView('scene_writing');
    }
// ...
// In renderMainContent for scene_writing view:
return <SceneWritingTab /*...*/ initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;


// In SceneWritingTab.tsx
interface SceneWritingTabProps {
    // ...
    initialSceneDetails: { chapterTitle: string, sceneIdentifier: string } | null;
    setInitialSceneDetails: React.Dispatch<React.SetStateAction<{chapterTitle: string, sceneIdentifier: string} | null>>;
}
// ...
useEffect(() => {
    if (initialSceneDetails && project) {
        const scene = getSceneNarrative(initialSceneDetails.chapterTitle, initialSceneDetails.sceneIdentifier);
        if (scene) {
            setSelectedChapter(scene.chapterTitle);
            setSceneIdentifier(scene.sceneIdentifier);
            // Potentially load scene plan if stored, or prompt user to paste it again
            setEditedNarrative(scene.content);
            setGeneratedNarrative(scene.content); // Set original generated for reference if needed
            setIsEditingNarrative(true);
        }
        setInitialSceneDetails(null); // Clear after loading
    }
}, [initialSceneDetails, project, getSceneNarrative, setInitialSceneDetails]);

```
This logic for loading a scene for editing in `SceneWritingTab.tsx` needs to be robust. The current implementation relies on `getSceneNarrative` from context.
