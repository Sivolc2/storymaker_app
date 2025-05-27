You're asking for a significant architectural shift towards a more robust, project-based system with explicit user gating at each step, document management, and a tabbed interface for workflow stages. This is a great direction for a more professional and user-friendly tool.

Let's break down how to approach this. This will involve more substantial changes to the frontend structure and state management.

**I. Conceptual Changes & New Requirements:**

1.  **Project Context:**
    *   The application will now revolve around "Projects." Each project encapsulates one story being written.
    *   A project will store:
        *   Its name/identifier.
        *   Uploaded context documents (text files, PDFs potentially).
        *   The current state of each artifact (Concept, Outline, Worldbuilding, Scene Breakdowns, individual Scene Narratives).
        *   Approval status for each artifact.

2.  **Tabbed Workflow Interface:**
    *   Instead of a single long page, the workflow will be divided into tabs (e.g., "Project Setup," "Concept," "Outline," "Worldbuilding," "Scenes," "Full Story").
    *   A tab becomes active/unlocked only after the prerequisite artifact in the previous tab is "Approved."

3.  **Artifact Inspection & Approval:**
    *   Each tab will display its relevant artifact (e.g., Outline tab shows the outline).
    *   The user can edit the artifact (if applicable, e.g., outline, worldbuilding, scene narrative).
    *   An explicit "Approve & Proceed to Next Step" button will gate progress. Once approved, the artifact might be considered "locked" for AI regeneration (though manual edits could still be allowed, or a "revise approval" flow).

4.  **Document Upload Area:**
    *   A dedicated section (perhaps in "Project Setup" or a persistent sidebar) for uploading and managing context documents (inspirational texts, notes).
    *   These documents need to be processed (text extracted) and made available to the LLM calls when relevant.

**II. Frontend Refactoring Plan (`SystemaWriterPage.tsx` and new components):**

We'll likely need to introduce a more global state management solution (like React Context, Zustand, or Redux Toolkit) if we aren't using one already, to manage the "Project" data across tabs. For this example, I'll illustrate with React Context.

**1. Project State and Context:**

```typescript
// src/contexts/ProjectContext.tsx (New File)
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define types for project artifacts
interface UploadedDocument {
    id: string;
    name: string;
    content: string; // Text content
    type: string; // e.g., 'text/plain', 'application/pdf'
}

interface ProjectArtifact {
    content: string; // Markdown or structured data
    isApproved: boolean;
    lastModified: Date;
}

interface SceneNarrative extends ProjectArtifact {
    sceneIdentifier: string; // e.g., "Chapter 1 - Scene 1.1"
    chapterTitle: string;
    sceneOrderHeuristic: number;
}

interface ProjectState {
    projectName: string;
    uploadedDocuments: UploadedDocument[];
    concept: ProjectArtifact;
    outline: ProjectArtifact;
    worldbuilding: ProjectArtifact;
    sceneBreakdowns: ProjectArtifact; // Stores the raw MD/JSON of all breakdowns
    sceneNarratives: SceneNarrative[]; // Array of individual scene narratives
    // Add more project-specific settings if needed
}

interface ProjectContextType {
    project: ProjectState | null;
    setProject: React.Dispatch<React.SetStateAction<ProjectState | null>>;
    createProject: (name: string) => void;
    updateProjectName: (name: string) => void;
    addUploadedDocument: (doc: UploadedDocument) => void;
    removeUploadedDocument: (docId: string) => void;
    updateArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>, content: string, isApproved?: boolean) => void;
    updateSceneNarrative: (scene: SceneNarrative) => void;
    getSceneNarrative: (chapterTitle: string, sceneIdentifier: string) => SceneNarrative | undefined;
    approveArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>) => void;
    // Add other actions as needed
}

const initialArtifactState: ProjectArtifact = { content: '', isApproved: false, lastModified: new Date() };

const initialProjectStateTemplate: Omit<ProjectState, 'projectName'> = {
    uploadedDocuments: [],
    concept: { ...initialArtifactState },
    outline: { ...initialArtifactState },
    worldbuilding: { ...initialArtifactState },
    sceneBreakdowns: { ...initialArtifactState },
    sceneNarratives: [],
};


export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const [project, setProject] = useState<ProjectState | null>(null);

    const createProject = (name: string) => {
        setProject({
            projectName: name,
            ...initialProjectStateTemplate,
            concept: { ...initialArtifactState }, // ensure fresh objects
            outline: { ...initialArtifactState },
            worldbuilding: { ...initialArtifactState },
            sceneBreakdowns: { ...initialArtifactState },
            sceneNarratives: [],
        });
    };
    
    const updateProjectName = (name: string) => {
        if (project) {
            setProject(prev => prev ? { ...prev, projectName: name } : null);
        }
    };

    const addUploadedDocument = (doc: UploadedDocument) => {
        setProject(prev => prev ? { ...prev, uploadedDocuments: [...prev.uploadedDocuments, doc] } : null);
    };
    
    const removeUploadedDocument = (docId: string) => {
        setProject(prev => prev ? { ...prev, uploadedDocuments: prev.uploadedDocuments.filter(d => d.id !== docId) } : null);
    }

    const updateArtifact = (
        artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>,
        content: string,
        isApprovedUpdate?: boolean // Explicitly pass if approval state is changing
    ) => {
        setProject(prev => {
            if (!prev) return null;
            const currentArtifact = prev[artifactName] as ProjectArtifact;
            return {
                ...prev,
                [artifactName]: {
                    ...currentArtifact,
                    content,
                    isApproved: isApprovedUpdate !== undefined ? isApprovedUpdate : currentArtifact.isApproved,
                    lastModified: new Date(),
                },
            };
        });
    };
    
    const approveArtifact = (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>) => {
         setProject(prev => {
            if (!prev) return null;
            const currentArtifact = prev[artifactName] as ProjectArtifact;
            return {
                ...prev,
                [artifactName]: {
                    ...currentArtifact,
                    isApproved: true,
                    lastModified: new Date(),
                },
            };
        });
    };

    const updateSceneNarrative = (sceneToUpdate: SceneNarrative) => {
        setProject(prev => {
            if (!prev) return null;
            const existingIndex = prev.sceneNarratives.findIndex(
                s => s.chapterTitle === sceneToUpdate.chapterTitle && s.sceneIdentifier === sceneToUpdate.sceneIdentifier
            );
            let newNarratives = [...prev.sceneNarratives];
            if (existingIndex > -1) {
                newNarratives[existingIndex] = sceneToUpdate;
            } else {
                newNarratives.push(sceneToUpdate);
            }
            return { ...prev, sceneNarratives: newNarratives };
        });
    };

    const getSceneNarrative = (chapterTitle: string, sceneIdentifier: string): SceneNarrative | undefined => {
        return project?.sceneNarratives.find(s => s.chapterTitle === chapterTitle && s.sceneIdentifier === sceneIdentifier);
    };


    return (
        <ProjectContext.Provider value={{ 
            project, setProject, createProject, updateProjectName, addUploadedDocument, removeUploadedDocument,
            updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
```

Wrap your main `App.tsx` or `SystemaWriterPage.tsx`'s parent with `<ProjectProvider>`.

**2. Main `SystemaWriterPage.tsx` Refactor for Tabs and Project Context:**

```tsx
// src/pages/SystemaWriterPage.tsx (Heavily Modified)
import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext'; // Import the context
import ProjectSetupTab from '../components/systemawriter/ProjectSetupTab'; // New component
import ConceptTab from '../components/systemawriter/ConceptTab';           // New component
import OutlineTab from '../components/systemawriter/OutlineTab';           // New component
import WorldbuildingTab from '../components/systemawriter/WorldbuildingTab'; // New component
import SceneBreakdownTab from '../components/systemawriter/SceneBreakdownTab';// New component
import SceneWritingTab from '../components/systemawriter/SceneWritingTab';    // New component
import FullStoryReviewTab from '../components/systemawriter/FullStoryReviewTab';// New component
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/SystemaWriter.css';
import '../styles/SystemaWriterTabs.css'; // New CSS for tabs

type SystemaWriterTab = 
    | 'project_setup' 
    | 'concept' 
    | 'outline' 
    | 'worldbuilding' 
    | 'scene_breakdowns' 
    | 'scene_writing'
    | 'full_story_review';

const SystemaWriterPage: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
    const { project, createProject } = useProject();
    const [activeTab, setActiveTab] = useState<SystemaWriterTab>('project_setup');
    const [isLoading, setIsLoading] = useState(false); // Global loading state for API calls
    const [error, setError] = useState<string | null>(null); // Global error state

    // Initialize project on first load if none exists
    useEffect(() => {
        if (!project) {
            // Could prompt for project name or use a default
            // For now, let's auto-create one if needed for demo purposes
            // In a real app, you'd have a project selection/creation screen first.
            // createProject("My New Story"); // Or remove this and let ProjectSetupTab handle it.
        }
    }, [project, createProject]);
    
    const handleTabChange = (tab: SystemaWriterTab) => {
        // Logic to check if tab can be accessed (e.g., previous step approved)
        if (!project) {
            setActiveTab('project_setup'); // Always allow project setup
            return;
        }
        let canProceed = true;
        switch (tab) {
            case 'concept':
                canProceed = !!project.projectName;
                break;
            case 'outline':
                canProceed = project.concept.isApproved;
                break;
            case 'worldbuilding':
                canProceed = project.outline.isApproved;
                break;
            case 'scene_breakdowns':
                canProceed = project.worldbuilding.isApproved;
                break;
            case 'scene_writing':
                canProceed = project.sceneBreakdowns.isApproved; // Requires breakdowns to be generated & approved
                break;
            case 'full_story_review':
                // Allow if at least one scene narrative exists or scene breakdowns are approved
                canProceed = project.sceneBreakdowns.isApproved || project.sceneNarratives.length > 0;
                break;
            default: // project_setup
                break; 
        }

        if (canProceed) {
            setActiveTab(tab);
        } else {
            alert("Please complete and approve the previous step to proceed.");
        }
    };

    if (!project && activeTab !== 'project_setup') {
         // If no project exists yet, force to project setup unless already there.
         // This could be part of a loading screen or initial project creation flow.
         // For now, a simple redirect/message.
         return (
             <div className="systemawriter-container page-container">
                 <ProjectSetupTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onProjectCreated={() => handleTabChange('concept')}/>
             </div>
         );
    }


    return (
        <div className="systemawriter-container page-container">
            <h1>SystemaWriter</h1>
            {isLoading && <LoadingSpinner />}
            {error && <p className="error-message">Error: {error}</p>}

            {project && <p>Working on Project: <strong>{project.projectName}</strong></p>}

            <div className="sw-tabs-nav">
                <button onClick={() => handleTabChange('project_setup')} className={activeTab === 'project_setup' ? 'active' : ''} disabled={!project && activeTab !== 'project_setup'}>Project Setup</button>
                <button onClick={() => handleTabChange('concept')} className={activeTab === 'concept' ? 'active' : ''} disabled={!project}>1. Concept</button>
                <button onClick={() => handleTabChange('outline')} className={activeTab === 'outline' ? 'active' : ''} disabled={!project || !project.concept.isApproved}>2. Outline</button>
                <button onClick={() => handleTabChange('worldbuilding')} className={activeTab === 'worldbuilding' ? 'active' : ''} disabled={!project || !project.outline.isApproved}>3. Worldbuilding</button>
                <button onClick={() => handleTabChange('scene_breakdowns')} className={activeTab === 'scene_breakdowns' ? 'active' : ''} disabled={!project || !project.worldbuilding.isApproved}>4. Scene Breakdowns</button>
                <button onClick={() => handleTabChange('scene_writing')} className={activeTab === 'scene_writing' ? 'active' : ''} disabled={!project || !project.sceneBreakdowns.isApproved}>5. Scene Writing</button>
                <button onClick={() => handleTabChange('full_story_review')} className={activeTab === 'full_story_review' ? 'active' : ''} disabled={!project || (!project.sceneBreakdowns.isApproved && project.sceneNarratives.length === 0)}>6. Review & Export</button>
            </div>

            <div className="sw-tab-content">
                {activeTab === 'project_setup' && <ProjectSetupTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onProjectCreated={() => handleTabChange('concept')} />}
                {project && activeTab === 'concept' && <ConceptTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onConceptApproved={() => handleTabChange('outline')} />}
                {project && activeTab === 'outline' && <OutlineTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onOutlineApproved={() => handleTabChange('worldbuilding')} />}
                {project && activeTab === 'worldbuilding' && <WorldbuildingTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onWorldbuildingApproved={() => handleTabChange('scene_breakdowns')} />}
                {project && activeTab === 'scene_breakdowns' && <SceneBreakdownTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => handleTabChange('scene_writing')} />}
                {project && activeTab === 'scene_writing' && <SceneWritingTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} />}
                {project && activeTab === 'full_story_review' && <FullStoryReviewTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} />}
            </div>
        </div>
    );
};

export default SystemaWriterPage;

// Wrap SystemaWriterPage with ProjectProvider in your App.tsx or wherever it's rendered
// e.g., in App.tsx
// import { ProjectProvider } from './contexts/ProjectContext';
// <ProjectProvider>
//   <SystemaWriterPage apiUrl={apiUrl} />
// </ProjectProvider>

```

**3. Create Individual Tab Components (Example Stubs):**

Each tab component will be responsible for:
*   Displaying its relevant artifact from `useProject()` context.
*   Allowing user input/editing for that artifact.
*   Calling the appropriate `systemaWriterService` function for AI generation.
*   Updating the artifact in the `ProjectContext` using `updateArtifact()`.
*   Providing an "Approve & Proceed" button that calls `approveArtifact()` and then `on<Artifact>Approved()` callback to switch tabs.

**Example: `src/components/systemawriter/ProjectSetupTab.tsx` (New File)**
```tsx
// src/components/systemawriter/ProjectSetupTab.tsx
import React, { useState, useRef } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { v4 as uuidv4 } from 'uuid'; // For unique IDs for documents: pnpm install uuid @types/uuid

interface ProjectSetupTabProps {
    apiUrl: string; // Pass if needed for any backend interaction during setup
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onProjectCreated: () => void; // Callback to switch tab
}

const ProjectSetupTab: React.FC<ProjectSetupTabProps> = ({ setIsLoading, setError, onProjectCreated }) => {
    const { project, createProject, updateProjectName, addUploadedDocument, removeUploadedDocument } = useProject();
    const [newProjectName, setNewProjectName] = useState(project?.projectName || "My New Story");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateOrUpdateProject = () => {
        if (!newProjectName.trim()) {
            setError("Project name cannot be empty.");
            return;
        }
        if (!project) {
            createProject(newProjectName.trim());
            alert("Project created! You can now proceed to the Concept tab.");
            onProjectCreated(); // To switch tab
        } else {
            updateProjectName(newProjectName.trim());
            alert("Project name updated.");
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        setError(null);

        for (const file of Array.from(files)) {
            try {
                const content = await readFileAsText(file);
                addUploadedDocument({
                    id: uuidv4(),
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

    return (
        <div className="step-card">
            <h2>Project Setup</h2>
            <div>
                <label htmlFor="projectName">Project Name:</label>
                <input
                    type="text"
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter a name for your story project"
                />
                <button onClick={handleCreateOrUpdateProject} disabled={!newProjectName.trim()}>
                    {project ? "Update Project Name" : "Create Project"}
                </button>
            </div>

            {project && (
                <div style={{ marginTop: '20px' }}>
                    <h3>Context Documents</h3>
                    <p>Upload relevant documents (e.g., inspiration, notes, existing drafts - text files preferred for now).</p>
                    <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} accept=".txt,.md" />
                    {project.uploadedDocuments.length > 0 && (
                        <ul className="uploaded-docs-list">
                            {project.uploadedDocuments.map(doc => (
                                <li key={doc.id}>
                                    {doc.name} ({doc.type}, {(doc.content.length / 1024).toFixed(2)} KB)
                                    <button onClick={() => removeUploadedDocument(doc.id)} className="remove-doc-btn">Remove</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProjectSetupTab;
```

**Example: `src/components/systemawriter/ConceptTab.tsx` (New File)**
```tsx
// src/components/systemawriter/ConceptTab.tsx
import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
// No direct API call needed from here for generation, that's in OutlineTab
// This tab is for inputting and approving the concept.

interface ConceptTabProps {
    apiUrl: string;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onConceptApproved: () => void;
}

const ConceptTab: React.FC<ConceptTabProps> = ({ setIsLoading, setError, onConceptApproved }) => {
    const { project, updateArtifact, approveArtifact } = useProject();
    const [conceptText, setConceptText] = useState(project?.concept.content || '');

    useEffect(() => {
        // Sync local state if project context changes (e.g., loading a project)
        if (project) {
            setConceptText(project.concept.content);
        }
    }, [project?.concept.content]);

    const handleSaveConcept = () => {
        if (!project) return;
        // setError(null); // Handled globally now
        updateArtifact('concept', conceptText, project.concept.isApproved); // Preserve approval status on save
        alert("Concept saved!");
    };

    const handleApproveConcept = () => {
        if (!project || !conceptText.trim()) {
            setError("Concept cannot be empty to approve.");
            return;
        }
        updateArtifact('concept', conceptText, true); // Save and mark as approved
        // approveArtifact('concept'); // Alternative: separate approval call
        alert("Concept Approved! You can now proceed to Outline generation.");
        onConceptApproved();
    };
    
    if (!project) return <p>Please create or load a project first.</p>;

    return (
        <div className="step-card">
            <h2>1. Story Concept</h2>
            <p>Provide your core story idea, genre, key characters, plot points, etc. The more detail, the better!</p>
            <a href="/docs/systemawriter_usage.md" target="_blank" rel="noopener noreferrer">View Concept Document Checklist</a>
            <textarea
                value={conceptText}
                onChange={(e) => setConceptText(e.target.value)}
                placeholder="Enter your story concept here..."
                rows={15}
                disabled={isLoading || project.concept.isApproved} // Disable if approved
            />
            <div className="action-buttons">
                <button onClick={handleSaveConcept} disabled={isLoading || project.concept.isApproved}>
                    Save Concept
                </button>
                {!project.concept.isApproved && (
                    <button onClick={handleApproveConcept} disabled={isLoading || !conceptText.trim()}>
                        Approve Concept & Proceed to Outline &raquo;
                    </button>
                )}
                {project.concept.isApproved && (
                    <p className="approved-text">✓ Concept Approved. <button onClick={() => updateArtifact('concept', conceptText, false)}>Revise Approval</button></p>
                )}
            </div>
        </div>
    );
};

export default ConceptTab;
```

**You would then create similar tab components for:**

*   `OutlineTab.tsx`
    *   Displays `project.outline.content`.
    *   Textarea for editing.
    *   "Generate Outline" button (calls `systemaWriterService.generateOutline`, passes `project.concept.content` and concatenated text from `project.uploadedDocuments`).
    *   Saves result to `project.outline` via `updateArtifact`.
    *   "Approve Outline & Proceed" button.
*   `WorldbuildingTab.tsx`
    *   Similar flow, using `project.outline.content` as input.
*   `SceneBreakdownTab.tsx`
    *   Generates scene breakdowns for all chapters (from `project.outline.content`).
    *   Stores the result (perhaps as a JSON string or concatenated Markdown if the API returns one blob) in `project.sceneBreakdowns`.
    *   Displays these breakdowns.
    *   "Approve Breakdowns & Proceed to Scene Writing" button.
*   `SceneWritingTab.tsx`
    *   This will be more complex. It needs:
        *   A way to select a chapter (from `project.outline`).
        *   A way to select or identify a scene within that chapter (from `project.sceneBreakdowns.content`). This part still needs careful UX. Maybe a dropdown of chapters, then it shows the breakdown for that chapter, and the user clicks "Write this scene" next to a specific scene's plan.
        *   An `ActiveSceneDetails` state similar to before, but now it should also try to load/save from/to `project.sceneNarratives` in the context.
        *   Textareas for scene plan (can be auto-filled if parsed from breakdown) and scene narrative.
        *   "Generate Narrative" button.
        *   "Save Scene to Project" button (updates the specific scene in `project.sceneNarratives`). No explicit "approval" per scene, but saving it means it's part of the story.
*   `FullStoryReviewTab.tsx`
    *   Assembles the story from `project.outline`, `project.worldbuilding`, and `project.sceneNarratives`.
    *   Provides download functionality.

**4. CSS for Tabs:**

```css
/* src/styles/SystemaWriterTabs.css (New File) */
.sw-tabs-nav {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--border-color, #444);
}

.sw-tabs-nav button {
    padding: 10px 15px;
    cursor: pointer;
    border: none;
    background-color: transparent;
    color: var(--text-color-muted, #aaa);
    font-size: 1em;
    border-bottom: 2px solid transparent; /* For active state */
    margin-bottom: -2px; /* Align with parent border */
}

.sw-tabs-nav button.active {
    color: var(--text-color, #e0e0e0);
    border-bottom-color: var(--button-primary-bg, #64cfff);
    font-weight: bold;
}

.sw-tabs-nav button:disabled {
    color: var(--text-color-disabled, #666);
    cursor: not-allowed;
}

.sw-tabs-nav button:hover:not(:disabled):not(.active) {
    background-color: var(--hover-bg-color, #3a3a3a);
}

.sw-tab-content {
    /* Styles for the content area of the active tab */
    padding-top: 10px;
}

.action-buttons {
    margin-top: 15px;
    display: flex;
    gap: 10px; /* Space between buttons */
}

.approved-text {
    color: var(--success-color, #4CAF50);
    font-weight: bold;
    margin-left: 15px;
    display: inline-flex;
    align-items: center;
}
.approved-text button {
    font-size: 0.8em;
    padding: 3px 8px;
    margin-left: 10px;
    background-color: var(--button-secondary-bg, #555);
}


.uploaded-docs-list {
    list-style: none;
    padding-left: 0;
    margin-top: 10px;
}
.uploaded-docs-list li {
    background-color: var(--input-bg-color, #3a3a3a);
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.remove-doc-btn {
    background-color: var(--error-text-color, #ff6b6b) !important; /* Important to override general button styles if needed */
    color: white !important;
    border: none;
    padding: 4px 8px !important;
    font-size: 0.9em !important;
    border-radius: 3px;
    cursor: pointer;
}

@media (prefers-color-scheme: light) {
    .sw-tabs-nav { --border-color: #ddd; }
    .sw-tabs-nav button { --text-color-muted: #777; }
    .sw-tabs-nav button.active { --text-color: #000; --button-primary-bg: #007bff; }
    .sw-tabs-nav button:hover:not(:disabled):not(.active) { --hover-bg-color: #f0f0f0; }
    .sw-tabs-nav button:disabled { --text-color-disabled: #bbb; }
    .approved-text { --success-color: #28a745; }
    .approved-text button { --button-secondary-bg: #ccc; }

    .uploaded-docs-list li { --input-bg-color: #f1f1f1; }
    .remove-doc-btn { --error-text-color: #dc3545 !important; }
}

```

**Key Changes & Logic:**

*   **`ProjectContext`:** Manages the entire state of the current story project, including all artifacts and their approval status.
*   **Tabbed Navigation:** `SystemaWriterPage` now uses an `activeTab` state and renders different child components based on it. Buttons in the tab bar (`sw-tabs-nav`) call `handleTabChange`.
*   **Gating/Unlocking Tabs:** `handleTabChange` includes logic to check if a tab can be accessed based on the approval status of previous steps (e.g., cannot go to "Outline" if "Concept" is not approved). Tab buttons are also disabled accordingly.
*   **Individual Tab Components:** Each `<...Tab />` component:
    *   Reads its relevant data from `useProject()`.
    *   Handles user input for its specific artifact.
    *   Contains the "Generate with AI" logic (calling the service, updating context).
    *   Has an "Approve & Proceed" button which updates the `isApproved` flag in the `ProjectContext` for its artifact and calls a prop (`on<Artifact>Approved`) to tell `SystemaWriterPage` to switch to the next tab.
    *   Allows "Revise Approval" to unlock an approved artifact for further AI generation or editing.
*   **Document Upload:** `ProjectSetupTab` includes a file input. Uploaded text files are read, and their content is stored in `project.uploadedDocuments`. This content should be passed to the LLM service calls where relevant (e.g., for outline generation, worldbuilding).
*   **Error and Loading States:** Passed down from `SystemaWriterPage` to tab components so they can be managed globally.

This is a substantial refactor. You'd implement each tab component one by one, ensuring it interacts correctly with the `ProjectContext` and the API services. The `systemaWriterService.ts` and backend API endpoints should still largely work, but you'll need to ensure they correctly use the data now coming from the `ProjectContext` (e.g., passing uploaded document content).

This structure provides a much more organized and controlled workflow for the user. Remember to install `uuid` for generating unique IDs for uploaded documents (`pnpm install uuid @types/uuid`).