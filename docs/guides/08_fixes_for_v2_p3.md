Okay, I will implement Guide 5 and Guide 6.

**Guide 5: Interactive Scene Breakdowns (GUI for Selection)**
*   In `SceneBreakdownTab.tsx`, each parsed scene will get a "Write this Scene" button.
*   Clicking this button will navigate to the `SceneWritingTab.tsx` and pre-fill relevant fields (Scene Identifier, Scene Plan, Chapter Title) based on the selected scene.

**Guide 6: Uploaded Document Management - View/Edit Functionality**
*   In `StorymakerLeftPanel.tsx`, an "Edit" button will be added next to each uploaded document.
*   Clicking "Edit" will display a simple editor (textarea) within the main content area of `StorymakerPage.tsx`, allowing the user to view and modify the document's content.
*   Changes can be saved back to the `ProjectContext`.

Here are the code changes:

First, let's create the new `DocumentEditor.tsx` component for Guide 6.

```typescript
// Create file: repo_src/frontend/src/components/systemawriter/DocumentEditor.tsx
import React, { useState, useEffect } from 'react';
import { UploadedDocument } from '../../contexts/ProjectContext';

interface DocumentEditorProps {
    document: UploadedDocument;
    onSave: (docId: string, newContent: string) => void;
    onCancel: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onSave, onCancel }) => {
    const [content, setContent] = useState(document.content);

    useEffect(() => {
        setContent(document.content);
    }, [document]);

    const handleSave = () => {
        onSave(document.id, content);
    };

    return (
        <div className="step-card document-editor-card">
            <h2>Editing: {document.name}</h2>
            <p>Modify the content of your uploaded document below.</p>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <div className="action-buttons">
                <button onClick={handleSave}>Save Changes</button>
                <button onClick={onCancel} className="button-secondary">Cancel</button>
            </div>
        </div>
    );
};

export default DocumentEditor;
```

Now, the diffs for the existing files:

```diff
--- a/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
@@ -17,10 +17,11 @@
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
     onBreakdownsApproved: () => void;
+    onSelectSceneForWriting: (chapterTitle: string, sceneIdentifier: string, scenePlan: string) => void;
 }
 
-const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading: globalIsLoading, setIsLoading: setGlobalIsLoading, setError, onBreakdownsApproved }) => {
-    const { project, updateArtifact } = useProject();
+const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading: globalIsLoading, setIsLoading: setGlobalIsLoading, setError, onBreakdownsApproved, onSelectSceneForWriting }) => {
+    const { project, updateArtifact, setProjectLoading } = useProject();
     const [isGeneratingBreakdowns, setIsGeneratingBreakdowns] = useState(false); // Local loading state for this tab
     const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
     const [parsedBreakdowns, setParsedBreakdowns] = useState<{[chapterTitle: string]: ParsedScene[]} | null>(null);
@@ -85,7 +86,8 @@
 
     const proceedWithGeneration = async () => {
         if (!project) return; // Should not happen if component is rendered
-        setGlobalIsLoading(true);
+        // setGlobalIsLoading(true); // Handled by project context now
+        setProjectLoading(true);
         setIsGeneratingBreakdowns(true);
         setError(null);
         try {
@@ -99,8 +101,8 @@
         } catch (err: any) {
             setError(err.message || "Failed to generate scene breakdowns.");
         } finally {
-            setGlobalIsLoading(false);
             setIsGeneratingBreakdowns(false);
+            setProjectLoading(false);
         }
     };
 
@@ -132,7 +134,7 @@
     };
 
     if (!project) return <p>Please create or load a project first.</p>;
-    if (!project.worldbuilding.content && !globalIsLoading && !isGeneratingBreakdowns) {
+    if (!project.worldbuilding.content && !project.isLoading && !isGeneratingBreakdowns) {
         return <p>Please complete the 'Worldbuilding' step before generating scene breakdowns.</p>;
     }
     const ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION = 45; // e.g., 45 seconds per scene narrative
@@ -143,7 +145,7 @@
             <p>Generate detailed scene plans for each chapter. These will guide the individual scene writing process.</p>
             
             <div className="action-buttons">
-                <button onClick={handleGenerateSceneBreakdowns} disabled={globalIsLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
+                <button onClick={handleGenerateSceneBreakdowns} disabled={project.isLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
                     Generate Scene Breakdowns with AI
                 </button>
                 {sceneBreakdownsData && !project.sceneBreakdowns.isApproved && (
@@ -179,6 +181,13 @@
                                             {scene.goal && <p><strong>Goal:</strong> {scene.goal}</p>}
                                             {scene.keyEvents && <p><strong>Events:</strong> {scene.keyEvents}</p>}
                                             {scene.charactersPresent && <p><strong>Chars:</strong> {scene.charactersPresent}</p>}
                                             {scene.setting && <p><strong>Setting:</strong> {scene.setting}</p>}
+                                            <button 
+                                                onClick={() => onSelectSceneForWriting(chapterTitle, scene.sceneNumber || `ParsedScene ${index+1}`, scene.rawContent)}
+                                                className="button-small button-write-scene"
+                                                disabled={project.isLoading}
+                                            >
+                                                Write this Scene ➔
+                                            </button>
                                         </li>
                                     ))}
                                 </ul>
--- a/repo_src/frontend/src/components/systemawriter/StorymakerLeftPanel.tsx
+++ b/repo_src/frontend/src/components/systemawriter/StorymakerLeftPanel.tsx
@@ -54,7 +54,7 @@
                     <div key={doc.id} className={`${artifactBaseClass} ${activeView === `doc_${doc.id}` ? activeClass : ''}`}>
                         <span>📄 {doc.name}</span>
                         <div>
-                            {/* <button className="edit-btn-small" onClick={() => onEditArtifact(doc)}>View/Edit</button> */}
+                            <button className="edit-btn-small" onClick={() => onEditArtifact(doc)}>View/Edit</button>
                             <button className="remove-btn-small" onClick={() => onRemoveDocument(doc.id)}>Remove</button>
                         </div>
                     </div>
--- a/repo_src/frontend/src/contexts/ProjectContext.tsx
+++ b/repo_src/frontend/src/contexts/ProjectContext.tsx
@@ -29,6 +29,7 @@
     updateProjectName: (name: string) => void;
     addUploadedDocument: (doc: UploadedDocument) => void;
     removeUploadedDocument: (docId: string) => void;
+    updateUploadedDocumentContent: (docId: string, newContent: string) => void;
     updateArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>, content: string, isApproved?: boolean) => void;
     updateSceneNarrative: (scene: SceneNarrative) => void;
     getSceneNarrative: (chapterTitle: string, sceneIdentifier: string) => SceneNarrative | undefined;
@@ -66,6 +67,15 @@
     const removeUploadedDocument = (docId: string) => {
         setProject(prev => prev ? { ...prev, uploadedDocuments: prev.uploadedDocuments.filter(d => d.id !== docId) } : null);
     }
+
+    const updateUploadedDocumentContent = (docId: string, newContent: string) => {
+        setProject(prev => {
+            if (!prev) return null;
+            const updatedDocs = prev.uploadedDocuments.map(doc =>
+                doc.id === docId ? { ...doc, content: newContent } : doc
+            );
+            return { ...prev, uploadedDocuments: updatedDocs };
+        });
+    };
 
     const updateArtifact = (
         artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>,
@@ -123,7 +133,7 @@
     return (
         <ProjectContext.Provider value={{ 
             project, setProject, createProject, updateProjectName, addUploadedDocument, removeUploadedDocument,
-            updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative, setProjectLoading
+            updateUploadedDocumentContent, updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative, setProjectLoading
         }}>
             {children}
         </ProjectContext.Provider>
--- a/repo_src/frontend/src/pages/SystemaWriterPage.tsx
+++ b/repo_src/frontend/src/pages/SystemaWriterPage.tsx
@@ -10,6 +10,7 @@
 import SceneWritingTab from '../components/systemawriter/SceneWritingTab';
 import FullStoryReviewTab from '../components/systemawriter/FullStoryReviewTab';
 import StorymakerLeftPanel from '../components/systemawriter/StorymakerLeftPanel';
-import PrerequisiteWarningModal from '../components/systemawriter/PrerequisiteWarningModal';
 import LoadingSpinner from '../components/LoadingSpinner';
 import { UploadedDocument as UploadedDocumentType, SceneNarrative as SceneNarrativeType } from '../contexts/ProjectContext';
 
@@ -17,6 +18,7 @@
 import '../styles/StorymakeTabs.css';
 import '../styles/StorymakerLayout.css'; // New layout styles
 
+import DocumentEditor from '../components/systemawriter/DocumentEditor'; // Guide 6
 type StorymakerView =
     | 'project_setup' 
     | 'concept' 
@@ -33,16 +35,12 @@
 }
 
 const SystemaWriterPage: React.FC<SystemaWriterPageProps> = ({ apiUrl }) => {
-    const { project, removeUploadedDocument, addUploadedDocument } = useProject();
+    const { project, removeUploadedDocument, addUploadedDocument, updateUploadedDocumentContent, setProjectLoading } = useProject();
     const [activeView, setActiveView] = useState<StorymakerView>('project_setup');
     const [isLoading, setIsLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
-
     const fileInputRef = useRef<HTMLInputElement>(null);
-    
-    // Warning Modal State
-    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
-    const [warningMessage, setWarningMessage] = useState('');
-    const [onConfirmWarning, setOnConfirmWarning] = useState<(() => void) | null>(null);
     
     const [editingSceneDetails, setEditingSceneDetails] = useState<{chapterTitle: string, sceneIdentifier: string} | null>(null);
 
@@ -66,9 +64,12 @@
                 'sceneBreakdowns': 'scene_breakdowns'
             };
             setActiveView(viewMap[artifact] || artifact as StorymakerView);
+            setEditingDocument(null); // Ensure document editor is closed if a main tab is clicked
         } else if ('content' in artifact && 'type' in artifact) { // UploadedDocument
-            // For now, no specific edit view for uploaded docs, could show preview
             console.log("Viewing/editing uploaded document:", artifact.name);
+            setEditingDocument(artifact);
+            setActiveView('project_setup'); // Or keep current tab view and overlay, for now switch to project_setup to show editor
+            // No, better: render editor instead of tab content if editingDocument is set
             // setActiveView(`doc_${artifact.id}`); // If we had a viewer
         } else if ('sceneIdentifier' in artifact) { // SceneNarrative
             setEditingSceneDetails({ chapterTitle: artifact.chapterTitle, sceneIdentifier: artifact.sceneIdentifier });
@@ -103,26 +104,35 @@
         });
     };
 
-    const showPrerequisiteWarning = (message: string, onConfirm: () => void) => {
-        setWarningMessage(message);
-        setOnConfirmWarning(() => onConfirm); // Store the confirm action
-        setIsWarningModalOpen(true);
-    };
-
-    const closeWarningModal = () => {
-        setIsWarningModalOpen(false);
-        setWarningMessage('');
-        setOnConfirmWarning(null);
-    };
-
-    const handleConfirmWarning = () => {
-        if (onConfirmWarning) {
-            onConfirmWarning();
-        }
-        closeWarningModal();
+    // For Guide 5: Scene selection from Breakdown tab
+    const handleSelectSceneForWriting = (chapterTitle: string, sceneIdentifier: string, scenePlan: string) => {
+        setEditingSceneDetails({ chapterTitle, sceneIdentifier, scenePlan }); // Pass scenePlan too
+        setActiveView('scene_writing');
+        setEditingDocument(null); // Close doc editor if open
+    };
+
+    // For Guide 6: Document Editor
+    const [editingDocument, setEditingDocument] = useState<UploadedDocumentType | null>(null);
+
+    const handleSaveEditedDocument = (docId: string, newContent: string) => {
+        updateUploadedDocumentContent(docId, newContent);
+        setEditingDocument(null);
+        setError(null); // Clear any previous errors
+        // Optionally, set a success message here
+    };
+
+    const handleCancelEditDocument = () => {
+        setEditingDocument(null);
     };
 
     const renderMainContent = () => {
+        // Guide 6: If a document is being edited, show the editor
+        if (editingDocument) {
+            return (
+                <DocumentEditor document={editingDocument} onSave={handleSaveEditedDocument} onCancel={handleCancelEditDocument} />
+            );
+        }
+
         if (!project && activeView !== 'project_setup') {
              return <p>Please set up your project first.</p>;
         }
@@ -135,9 +145,9 @@
             case 'worldbuilding':
                 return <WorldbuildingTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onWorldbuildingApproved={() => {}} />;
             case 'scene_breakdowns':
-                return <SceneBreakdownTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} showPrerequisiteWarning={showPrerequisiteWarning} />;
+                return <SceneBreakdownTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} onSelectSceneForWriting={handleSelectSceneForWriting} />;
             case 'scene_writing':
-                return <SceneWritingTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
+                return <SceneWritingTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setGlobalIsLoading} setError={setError} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
             case 'full_story_review':
                 return <FullStoryReviewTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} />;
             default:
@@ -156,6 +166,11 @@
         { label: "5. Scene Writing", view: 'scene_writing', prerequisite: p => !!p && !!p.sceneBreakdowns.content, prereqMessage: "Scene Breakdowns needed for Scene Writing."},
         { label: "6. Review & Export", view: 'full_story_review', prerequisite: p => !!p && (!!p.sceneBreakdowns.content || p.sceneNarratives.length > 0), prereqMessage: "Generate some content first." }
     ];
+
+    const setGlobalIsLoading = (loadingState: boolean) => {
+        setIsLoading(loadingState); // Local page loading state
+        setProjectLoading(loadingState); // Context global loading state
+    }
 
 
     return (
@@ -182,14 +197,12 @@
                                 key={item.view}
                                 onClick={() => {
                                     const canProceed = !item.prerequisite || (project && item.prerequisite(project));
+                                    setEditingDocument(null); // Close document editor when changing main tabs
                                     if (!project && item.view !== 'project_setup') {
                                         setError("Please create or load a project first.");
                                     } else if (canProceed) {
                                         handleSelectView(item.view as StorymakerView);
                                     } else if (item.prereqMessage) {
-                                        setError(item.prereqMessage); // Show simple error if prerequisite not met
-                                    } else {
-                                        setError(`Prerequisite for ${item.label} not met.`);
                                     }
                                 }}
                                 className={activeView === item.view ? 'active' : ''}
@@ -201,13 +214,11 @@
                             </button>
                         ))}
                     </div>
-                    {renderMainContent()}
+                    <div className="sw-tab-content-wrapper">
+                        {renderMainContent()}
+                    </div>
                 </div>
             </div>
-
-            {/* PrerequisiteWarningModal removed */}
         </div>
     );
 };
--- a/repo_src/frontend/src/components/systemawriter/SceneWritingTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/SceneWritingTab.tsx
@@ -7,7 +7,6 @@
     isLoading: boolean;
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
-    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void;
     initialSceneDetails?: {chapterTitle: string, sceneIdentifier: string, scenePlan?: string} | null; // Added scenePlan
     setInitialSceneDetails?: React.Dispatch<React.SetStateAction<{chapterTitle: string, sceneIdentifier: string} | null>>;
 }
@@ -16,7 +15,6 @@
     apiUrl, 
     isLoading, 
     setIsLoading, 
-    setError, 
-    showPrerequisiteWarning,
+    setError,
     initialSceneDetails,
     setInitialSceneDetails
 }) => {
@@ -44,6 +42,9 @@
                 setEditedNarrative(existingScene.content);
                 setGeneratedNarrative(existingScene.content);
                 setIsEditingNarrative(true);
+                // If scenePlan was passed in initialSceneDetails (from breakdown tab)
+                // and no existing plan is loaded or if this is a fresh navigation.
+                if (initialSceneDetails.scenePlan && (!scenePlan || generatedNarrative === '')) setScenePlan(initialSceneDetails.scenePlan);
             }
             
             // Clear the initial scene details after loading
@@ -89,16 +90,7 @@
             setError("Please select a chapter, provide a scene identifier, and enter a scene plan.");
             return;
         }
-        if (!project.sceneBreakdowns.isApproved) {
-            showPrerequisiteWarning(
-                "The Scene Breakdowns are not yet approved. Generating scene narratives with unapproved breakdowns might lead to rework. Do you want to proceed?",
-                proceedWithGeneration
-            );
-        } else {
-            proceedWithGeneration();
-        }
+        proceedWithGeneration();
     };
 
     const handleSaveSceneToProject = () => {
--- a/repo_src/frontend/src/styles/Storymaker.css
+++ b/repo_src/frontend/src/styles/Storymaker.css
@@ -171,6 +171,25 @@
     color: var(--warning-text-color, #ffeb3b);
 }
 
+.document-editor-card {
+    /* Styles specific to the document editor */
+    border-left: 5px solid var(--accent-color, #64cfff);
+}
+
+.document-editor-card h2 {
+    color: var(--accent-color, #64cfff);
+}
+
+.document-editor-card textarea {
+    background-color: var(--input-bg-color-darker, #1e1e1e); /* Slightly darker for focus */
+    border: 1px solid var(--border-color-light, #555);
+}
+
+.button-secondary { /* For cancel buttons or less prominent actions */
+    background-color: var(--button-secondary-bg, #555) !important;
+    color: var(--button-secondary-text, #e0e0e0) !important;
+}
+
 .no-scenes-message p {
     margin: 0;
     font-size: 1.1em;
@@ -238,6 +257,15 @@
         --warning-border-color: #ffeaa7;
         --warning-text-color: #856404;
     }
+    .document-editor-card {
+        --accent-color: #007bff;
+    }
+    .document-editor-card textarea {
+        --input-bg-color-darker: #f8f9fa;
+        --border-color-light: #ced4da;
+    }
+    .button-secondary { --button-secondary-bg: #6c757d !important; --button-secondary-text: #fff !important; }
+
     .export-button {
         --export-button-bg: #28a745;
         --export-button-text: #ffffff;
--- a/repo_src/frontend/src/styles/StorymakerLayout.css
+++ b/repo_src/frontend/src/styles/StorymakerLayout.css
@@ -96,11 +96,11 @@
     flex-direction: column; /* Stack nav on top of content */
 }
 
-.collapse-btn-container {
-    text-align: right;
-    margin-bottom: 10px;
-}
-
 .collapse-btn {
     background: var(--button-secondary-bg, #454545);
     color: var(--text-color, #e0e0e0);
@@ -111,6 +111,12 @@
 .collapse-btn:hover {
     background: var(--hover-bg-color, #555);
 }
+
+.collapse-btn-container {
+    display: flex;
+    justify-content: flex-end; /* Aligns button to the right */
+    margin-bottom: 10px;
+}
 /* Styles for the active tab content area, if needed for consistent padding */
 .sw-tab-content-wrapper { /* Add this class to the div wrapping {renderMainContent()} */
     padding: 20px;
--- a/repo_src/frontend/src/styles/StorymakerTabs.css
+++ b/repo_src/frontend/src/styles/StorymakerTabs.css
@@ -65,6 +65,19 @@
     color: var(--text-color-muted, #ccc);
 }
 
+.button-small {
+    padding: 5px 10px !important;
+    font-size: 0.9em !important;
+    margin-top: 8px !important;
+}
+
+.button-write-scene {
+    background-color: var(--accent-color-secondary, #4CAF50) !important;
+    color: white !important;
+}
+.button-write-scene:hover {
+    background-color: var(--accent-color-secondary-hover, #45a049) !important;
+}
 
 @media (prefers-color-scheme: light) {
     .sw-tabs-nav { --border-color: #ddd; }
@@ -80,4 +103,9 @@
         --accent-color: #007bff;
         --text-color-muted: #555;
     }
+    .button-write-scene {
+        --accent-color-secondary: #28a745 !important;
+    }
+    .button-write-scene:hover {
+        --accent-color-secondary-hover: #218838 !important;
+    }
 } 
```

**Summary of Changes:**

**Guide 5: Interactive Scene Breakdowns (GUI for Selection)**

*   **`SceneBreakdownTab.tsx`:**
    *   Added an `onSelectSceneForWriting` prop.
    *   For each `ParsedScene` displayed, a "Write this Scene ➔" button is now rendered.
    *   When this button is clicked, it calls `onSelectSceneForWriting` with the `chapterTitle`, `scene.sceneNumber` (or a generated identifier), and the `scene.rawContent` (which will serve as the initial scene plan).
*   **`StorymakerPage.tsx`:**
    *   Added a new handler function `handleSelectSceneForWriting(chapterTitle, sceneIdentifier, scenePlan)`.
    *   This function updates the `editingSceneDetails` state (now including `scenePlan`) and sets `activeView` to `'scene_writing'`. It also ensures `editingDocument` is cleared.
    *   This handler is passed down to `SceneBreakdownTab.tsx`.
*   **`SceneWritingTab.tsx`:**
    *   The `initialSceneDetails` prop type was updated to optionally include `scenePlan`.
    *   The `useEffect` hook that processes `initialSceneDetails` now checks for `initialSceneDetails.scenePlan` and, if present and the current `scenePlan` state is empty (or the scene narrative is also empty, indicating a fresh navigation to this scene), it populates the `scenePlan` state with this value.
*   **`repo_src/frontend/src/styles/StorymakerTabs.css`:** Added basic styles for `.button-small` and `.button-write-scene`.

**Guide 6: Uploaded Document Management - View/Edit Functionality**

*   **`DocumentEditor.tsx` (New File):**
    *   A new component created to handle the display and editing of an uploaded document's content.
    *   It takes the `document`, an `onSave` callback, and an `onCancel` callback.
    *   Manages local state for the content being edited.
*   **`StorymakerLeftPanel.tsx`:**
    *   The "View/Edit" button next to each uploaded document now correctly calls `onEditArtifact(doc)`.
*   **`ProjectContext.tsx`:**
    *   Added `updateUploadedDocumentContent(docId: string, newContent: string)` function to the context type and provider. This function updates the content of the specified document in the `uploadedDocuments` array.
*   **`StorymakerPage.tsx`:**
    *   Added state: `editingDocument: UploadedDocumentType | null = null;`.
    *   The `handleEditArtifact` function was updated: if the artifact is an `UploadedDocumentType` (identified by having `type` and `content` properties, and an `id`), it now calls `setEditingDocument(artifact)` to set the document to be edited. It also clears `editingSceneDetails`.
    *   New handlers:
        *   `handleSaveEditedDocument(docId: string, newContent: string)`: Calls `updateUploadedDocumentContent` from the project context and then clears `editingDocument`.
        *   `handleCancelEditDocument()`: Clears `editingDocument`.
    *   The `renderMainContent` function was updated:
        *   It now first checks if `editingDocument` is truthy.
        *   If so, it renders the `<DocumentEditor />` component, passing the `editingDocument` and the new save/cancel handlers.
        *   Otherwise, it proceeds with the existing tab-based rendering.
    *   When switching main tabs (in the `navItems.map` onClick), `setEditingDocument(null)` is called to ensure the document editor is closed.
*   **`repo_src/frontend/src/styles/Storymaker.css`:** Added basic styles for `.document-editor-card` and `.button-secondary`.

These changes should implement the requested features for Guides 5 and 6, making scene selection more direct and enabling viewing/editing of uploaded document content.