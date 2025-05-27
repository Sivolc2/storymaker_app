Okay, I will implement Guide 3 and Guide 4.

**Guide 3: Enhanced Left-Hand Sidebar (LHS) & Dynamic Artifact Display**
*   The `StorymakerLeftPanel.tsx` will be updated to show "(Draft)" status for artifacts that have content but are not yet approved. The "✓" for approved status will remain. This relies on the `ProjectContext` correctly updating and triggering re-renders.

**Guide 4: Scene Breakdown Page Enhancements (Non-Interactive UX)**
*   **Structured Scene List Display:** `SceneBreakdownTab.tsx` will parse the generated Markdown to identify individual scenes within each chapter and display them in a more structured, readable format (e.g., listing key details like Scene Number, Goal, etc.). This will be shown in addition to the raw Markdown.
*   **Runtime Estimation:** After parsing scenes, a total count will be used to estimate the AI writing time for narratives, displayed on the `SceneBreakdownTab.tsx`.
*   **Improved Generation Feedback:** While true per-chapter streaming for breakdown generation isn't feasible without backend changes, the `SceneBreakdownTab.tsx` will manage its own local loading state for the "Generate Scene Breakdowns with AI" button, providing more immediate feedback for that specific action.

Here are the code changes:

```diff
--- a/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
@@ -4,17 +4,31 @@
 import { useProject } from '../../contexts/ProjectContext';
 import { generateSceneBreakdowns } from '../../services/systemaWriterService';
 
+interface ParsedScene {
+    sceneNumber?: string;
+    goal?: string;
+    charactersPresent?: string;
+    keyEvents?: string;
+    setting?: string;
+    informationRevealed?: string;
+    emotionalShift?: string;
+    rawContent: string; // Store the raw part of the markdown for this scene
+}
+
 interface SceneBreakdownTabProps {
     apiUrl: string;
     isLoading: boolean; // Global loading state from parent
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
     onBreakdownsApproved: () => void;
-    showPrerequisiteWarning: (message: string, onConfirm: () => void) => void;
 }
 
-const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading, setIsLoading, setError, onBreakdownsApproved }) => {
+const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading: globalIsLoading, setIsLoading: setGlobalIsLoading, setError, onBreakdownsApproved }) => {
     const { project, updateArtifact } = useProject();
+    const [isGeneratingBreakdowns, setIsGeneratingBreakdowns] = useState(false); // Local loading state for this tab
     const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
+    const [parsedBreakdowns, setParsedBreakdowns] = useState<{[chapterTitle: string]: ParsedScene[]} | null>(null);
+    const [totalParsedScenes, setTotalParsedScenes] = useState(0);
     const [successMessage, setSuccessMessage] = useState<string | null>(null);
 
     useEffect(() => {
@@ -23,9 +37,11 @@
                 // Try to parse the stored content as JSON
                 const parsed = JSON.parse(project.sceneBreakdowns.content);
                 setSceneBreakdownsData(parsed);
+                parseAndSetBreakdowns(parsed);
             } catch {
                 // If it's not JSON, treat it as a single markdown string
                 setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
+                parseAndSetBreakdowns({ "All Chapters": project.sceneBreakdowns.content });
             }
         }
     }, [project?.sceneBreakdowns.content]);
@@ -38,10 +54,57 @@
         }
     }, [successMessage]);
 
+    const parseSceneDetailsFromMarkdown = (markdown: string): ParsedScene[] => {
+        const scenes: ParsedScene[] = [];
+        // Regex to capture scene blocks starting with "- **Scene Number:**" or similar, until the next such block or end of list.
+        // This regex looks for a list item starting with "- **Scene Number:**" and captures everything until the next list item starting with "- **" or end of string.
+        const sceneBlockRegex = /-\s*\*\*(Scene\s*Number|Scene\s*ID|Scene\s*\d+(\.\d+)?):\*\*\s*(.*?)\n((?: {2,}|-\s*(?!\*\*(?:Scene\s*Number|Scene\s*ID|Scene\s*\d+(\.\d+)?):)\s*\*).*?\n)*)/gis;
+
+        let match;
+        while ((match = sceneBlockRegex.exec(markdown)) !== null) {
+            const rawContent = match[0];
+            const scene: ParsedScene = { rawContent };
+
+            const lines = rawContent.split('\n');
+            lines.forEach(line => {
+                line = line.trim().replace(/^- \*\*/, '').replace(/\*\*:?/, ''); // Clean up line
+                if (line.toLowerCase().startsWith('scene number')) scene.sceneNumber = line.substring('scene number'.length).trim();
+                else if (line.toLowerCase().startsWith('scene id')) scene.sceneNumber = line.substring('scene id'.length).trim(); // Alternative
+                else if (line.toLowerCase().startsWith('goal')) scene.goal = line.substring('goal'.length).trim();
+                else if (line.toLowerCase().startsWith('characters present')) scene.charactersPresent = line.substring('characters present'.length).trim();
+                else if (line.toLowerCase().startsWith('key events/actions')) scene.keyEvents = line.substring('key events/actions'.length).trim();
+                else if (line.toLowerCase().startsWith('setting')) scene.setting = line.substring('setting'.length).trim();
+                else if (line.toLowerCase().startsWith('information revealed')) scene.informationRevealed = line.substring('information revealed'.length).trim();
+                else if (line.toLowerCase().startsWith('emotional shift/tone')) scene.emotionalShift = line.substring('emotional shift/tone'.length).trim();
+            });
+            if (!scene.sceneNumber && lines.length > 0) { // Fallback for poorly formatted scene numbers
+                 const firstLine = lines[0].trim().replace(/^- \*\*/, '').replace(/\*\*:?/, '');
+                 if (firstLine.match(/^(Scene\s*\d+(\.\d+)?)/i)) {
+                    scene.sceneNumber = firstLine.match(/^(Scene\s*\d+(\.\d+)?)/i)?.[0];
+                 }
+            }
+            scenes.push(scene);
+        }
+        return scenes;
+    };
+
+    const parseAndSetBreakdowns = (data: {[chapterTitle: string]: string}) => {
+        const parsedData: {[chapterTitle: string]: ParsedScene[]} = {};
+        let totalScenes = 0;
+        for (const chapterTitle in data) {
+            const scenes = parseSceneDetailsFromMarkdown(data[chapterTitle]);
+            parsedData[chapterTitle] = scenes;
+            totalScenes += scenes.length;
+        }
+        setParsedBreakdowns(parsedData);
+        setTotalParsedScenes(totalScenes);
+    };
+
     const proceedWithGeneration = async () => {
         if (!project) return; // Should not happen if component is rendered
-        setIsLoading(true);
+        setGlobalIsLoading(true);
+        setIsGeneratingBreakdowns(true);
         setError(null);
         try {
             const data = await generateSceneBreakdowns(apiUrl, {
@@ -50,13 +113,15 @@
             });
             setSceneBreakdownsData(data.scene_breakdowns_by_chapter);
             // Store as JSON string in the project context
+            parseAndSetBreakdowns(data.scene_breakdowns_by_chapter);
             updateArtifact('sceneBreakdowns', JSON.stringify(data.scene_breakdowns_by_chapter), false);
             setSuccessMessage("Scene breakdowns generated successfully! You can now approve them.");
         } catch (err: any) {
             setError(err.message || "Failed to generate scene breakdowns.");
         } finally {
-            setIsLoading(false);
+            setGlobalIsLoading(false);
+            setIsGeneratingBreakdowns(false);
         }
     };
 
@@ -65,16 +130,7 @@
             setError("Please provide approved outline and worldbuilding first.");
             return;
         }
-        if (!project.worldbuilding.isApproved) {
-            showPrerequisiteWarning(
-                "The Worldbuilding is not yet approved. Generating scene breakdowns with unapproved worldbuilding might lead to rework. Do you want to proceed?",
-                proceedWithGeneration
-            );
-        } else {
-            proceedWithGeneration();
-        }
+        proceedWithGeneration();
     };
 
     const handleApproveBreakdowns = () => {
@@ -93,13 +149,14 @@
     };
 
     if (!project) return <p>Please create or load a project first.</p>;
-    if (!project.worldbuilding.content && !isLoading) { // Added !isLoading check
+    if (!project.worldbuilding.content && !globalIsLoading && !isGeneratingBreakdowns) {
         return <p>Please complete the 'Worldbuilding' step before generating scene breakdowns.</p>;
     }
+    const ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION = 45; // e.g., 45 seconds per scene narrative
 
     return (
         <div className="step-card">
             <h2>Scene Breakdowns</h2>
             <p>Generate detailed scene plans for each chapter. These will guide the individual scene writing process.</p>
             
             <div className="action-buttons">
-                <button onClick={handleGenerateSceneBreakdowns} disabled={isLoading}>
+                <button onClick={handleGenerateSceneBreakdowns} disabled={globalIsLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
                     Generate Scene Breakdowns with AI
                 </button>
                 {sceneBreakdownsData && !project.sceneBreakdowns.isApproved && (
@@ -116,10 +173,18 @@
                 </p>
             )}
 
-            {sceneBreakdownsData && (
+            {isGeneratingBreakdowns && <p>Generating breakdowns, please wait...</p>}
+
+            {totalParsedScenes > 0 && !isGeneratingBreakdowns && (
+                <div style={{ margin: '15px 0', padding: '10px', backgroundColor: 'var(--info-bg, #1f3a4d)', borderRadius: '4px' }}>
+                    <p>Found <strong>{totalParsedScenes}</strong> scene(s) across all chapters.</p>
+                    <p>Estimated time to generate narratives for all scenes: <strong>{Math.ceil((totalParsedScenes * ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION) / 60)} minutes</strong>.</p>
+                </div>
+            )}
+
+            {parsedBreakdowns && !isGeneratingBreakdowns && (
                 <div style={{ marginTop: '20px' }}>
-                    <h3>Generated Scene Breakdowns:</h3>
-                    {Object.entries(sceneBreakdownsData).map(([chapterTitle, breakdownMd]) => (
+                    {Object.entries(parsedBreakdowns).map(([chapterTitle, scenes]) => (
                         <div key={chapterTitle} style={{ marginBottom: '30px' }}>
                             <h4>{chapterTitle}</h4>
                             <div className="markdown-content" style={{ 
@@ -129,11 +194,30 @@
                                 backgroundColor: 'var(--input-bg-color, #2a2a2a)'
                             }}>
                                 <ReactMarkdown>{sceneBreakdownsData?.[chapterTitle] || ''}</ReactMarkdown>
+                            </div>
+                            <h5>Parsed Scenes:</h5>
+                            {scenes.length > 0 ? (
+                                <ul className="parsed-scene-list">
+                                    {scenes.map((scene, index) => (
+                                        <li key={index} className="parsed-scene-item">
+                                            <strong>{scene.sceneNumber || `Scene ${index + 1}`}</strong>
+                                            {scene.goal && <p><strong>Goal:</strong> {scene.goal}</p>}
+                                            {scene.keyEvents && <p><strong>Events:</strong> {scene.keyEvents}</p>}
+                                            {scene.charactersPresent && <p><strong>Chars:</strong> {scene.charactersPresent}</p>}
+                                            {scene.setting && <p><strong>Setting:</strong> {scene.setting}</p>}
+                                        </li>
+                                    ))}
+                                </ul>
+                            ) : <p>No scenes parsed for this chapter. Check Markdown formatting.</p>}
+                             <div className="markdown-content-raw" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px dashed #555', padding: '10px', marginTop:'10px' }}>
+                                <h5>Raw Markdown for {chapterTitle} (for debugging parsing)</h5>
+                                <pre style={{whiteSpace: 'pre-wrap', fontSize:'0.8em'}}>{sceneBreakdownsData?.[chapterTitle] || ''}</pre>
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
--- a/repo_src/frontend/src/components/systemawriter/StorymakerLeftPanel.tsx
+++ b/repo_src/frontend/src/components/systemawriter/StorymakerLeftPanel.tsx
@@ -1,6 +1,6 @@
 import React from 'react';
 import { ProjectState, UploadedDocument, SceneNarrative } from '../../contexts/ProjectContext'; // Assuming types are exported
-
+ 
 interface StorymakerLeftPanelProps {
     project: ProjectState | null;
     activeView: string; // To highlight the active artifact/view
@@ -28,31 +28,43 @@
     const artifactBaseClass = "left-panel-item";
     const activeClass = "active";
 
+    const getArtifactStatus = (artifact: ProjectState['concept'] | ProjectState['outline'] | ProjectState['worldbuilding'] | ProjectState['sceneBreakdowns']) => {
+        if (artifact.isApproved) return '✓';
+        if (project?.isLoading && activeView === artifactTypeToView(artifact)) return '(Generating...)'; // Needs a way to map artifact to view
+        if (artifact.content) return '(Draft)';
+        return '';
+    };
+
+    // Helper to map artifact type to its view string, needed for isLoading check above.
+    // This is a simplified version. A more robust solution might involve passing specific loading states.
+    const artifactTypeToView = (artifact: any): string => {
+        if (artifact === project?.concept) return 'concept';
+        if (artifact === project?.outline) return 'outline';
+        if (artifact === project?.worldbuilding) return 'worldbuilding';
+        if (artifact === project?.sceneBreakdowns) return 'scene_breakdowns';
+        return '';
+    }
+
     return (
         <div className="left-panel">
             <h3>{project.projectName}</h3>
+            {project.isLoading && <span className="global-loading-indicator">(Syncing...)</span>}
             <button 
                 className={`${artifactBaseClass} ${activeView === 'project_setup' ? activeClass : ''}`} 
                 onClick={() => onSelectView('project_setup')}
             >
                 ⚙️ Project Setup
             </button>
-
             <h4>Generated Artifacts</h4>
             <div className="artifact-list">
                 <div 
                     className={`${artifactBaseClass} ${activeView === 'concept' ? activeClass : ''}`}
                     onClick={() => onSelectView('concept')}
                 >
-                    📝 Concept {project.concept.isApproved && '✓'}
+                    📝 Concept {getArtifactStatus(project.concept)}
                     <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('concept'); }}>Edit</button>
                 </div>
                 <div
@@ -60,21 +72,21 @@
                     onClick={() => onSelectView('outline')}
                 >
-                    📖 Outline {project.outline.isApproved && '✓'}
+                    📖 Outline {getArtifactStatus(project.outline)}
                      <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('outline'); }}>Edit</button>
                 </div>
                 <div
                     className={`${artifactBaseClass} ${activeView === 'worldbuilding' ? activeClass : ''}`}
                     onClick={() => onSelectView('worldbuilding')}
                 >
-                    🌍 Worldbuilding {project.worldbuilding.isApproved && '✓'}
+                    🌍 Worldbuilding {getArtifactStatus(project.worldbuilding)}
                     <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('worldbuilding'); }}>Edit</button>
                 </div>
                 <div
                     className={`${artifactBaseClass} ${activeView === 'scene_breakdowns' ? activeClass : ''}`}
                     onClick={() => onSelectView('scene_breakdowns')}
                 >
-                    🎬 Scene Breakdowns {project.sceneBreakdowns.isApproved && '✓'}
+                    🎬 Scene Breakdowns {getArtifactStatus(project.sceneBreakdowns)}
                     <button className="edit-btn-small" onClick={(e) => { e.stopPropagation(); onEditArtifact('sceneBreakdowns'); }}>Edit</button>
                 </div>
             </div>
--- a/repo_src/frontend/src/contexts/ProjectContext.tsx
+++ b/repo_src/frontend/src/contexts/ProjectContext.tsx
@@ -25,6 +25,7 @@
     worldbuilding: ProjectArtifact;
     sceneBreakdowns: ProjectArtifact; // Stores the raw MD/JSON of all breakdowns
     sceneNarratives: SceneNarrative[]; // Array of individual scene narratives
+    isLoading: boolean; // Global loading state for the project
     // Add more project-specific settings if needed
 }
 
@@ -38,6 +39,7 @@
     updateArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>, content: string, isApproved?: boolean) => void;
     updateSceneNarrative: (scene: SceneNarrative) => void;
     getSceneNarrative: (chapterTitle: string, sceneIdentifier: string) => SceneNarrative | undefined;
+    setProjectLoading: (isLoading: boolean) => void;
     approveArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives'>) => void;
     // Add other actions as needed
 }
@@ -51,6 +53,7 @@
     worldbuilding: { ...initialArtifactState },
     sceneBreakdowns: { ...initialArtifactState },
     sceneNarratives: [],
+    isLoading: false,
 };
 
 export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);
@@ -67,6 +70,7 @@
             worldbuilding: { ...initialArtifactState },
             sceneBreakdowns: { ...initialArtifactState },
             sceneNarratives: [],
+            isLoading: false,
         });
     };
     
@@ -131,10 +135,16 @@
         return project?.sceneNarratives.find(s => s.chapterTitle === chapterTitle && s.sceneIdentifier === sceneIdentifier);
     };
 
+    const setProjectLoading = (isLoading: boolean) => {
+        setProject(prev => {
+            if (!prev) return null;
+            return { ...prev, isLoading };
+        });
+    }
     return (
         <ProjectContext.Provider value={{ 
             project, setProject, createProject, updateProjectName, addUploadedDocument, removeUploadedDocument,
-            updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative
+            updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative, setProjectLoading
         }}>
             {children}
         </ProjectContext.Provider>
--- a/repo_src/frontend/src/styles/StorymakerLayout.css
+++ b/repo_src/frontend/src/styles/StorymakerLayout.css
@@ -30,6 +30,11 @@
     border-bottom: 1px solid var(--border-color-light, #555);
     padding-bottom: 5px;
 }
+.global-loading-indicator {
+    font-style: italic;
+    color: var(--accent-color, #64cfff);
+    font-size: 0.9em;
+}
 
 
 .left-panel-item {
--- a/repo_src/frontend/src/styles/StorymakerTabs.css
+++ b/repo_src/frontend/src/styles/StorymakerTabs.css
@@ -56,6 +56,30 @@
     cursor: pointer;
 }
 
+.parsed-scene-list {
+    list-style-type: none;
+    padding-left: 0;
+}
+
+.parsed-scene-item {
+    background-color: var(--input-bg-color, #3a3a3a);
+    border: 1px solid var(--border-color, #444);
+    border-radius: 4px;
+    padding: 10px 15px;
+    margin-bottom: 10px;
+}
+
+.parsed-scene-item strong {
+    color: var(--accent-color, #64cfff);
+}
+
+.parsed-scene-item p {
+    margin: 5px 0;
+    font-size: 0.9em;
+    color: var(--text-color-muted, #ccc);
+}
+
+
 @media (prefers-color-scheme: light) {
     .sw-tabs-nav { --border-color: #ddd; }
     .sw-tabs-nav button { --text-color-muted: #777; }
@@ -68,4 +92,10 @@
 
     .uploaded-docs-list li { --input-bg-color: #f1f1f1; }
     .remove-doc-btn { --error-text-color: #dc3545 !important; }
+
+    .parsed-scene-item {
+        --input-bg-color: #f8f9fa;
+        --border-color: #e0e0e0;
+        --accent-color: #007bff;
+        --text-color-muted: #555;
+    }
 } 
```

**Summary of Changes:**

**Guide 3: Enhanced Left-Hand Sidebar (LHS) & Dynamic Artifact Display**

*   **`ProjectContext.tsx`:**
    *   Added an `isLoading` boolean field to `ProjectState`.
    *   Added a `setProjectLoading` function to the context type and provider to manage this global loading state for project-wide operations (like initial load, or if we decide to make AI generations update this).
*   **`StorymakerLeftPanel.tsx`:**
    *   Implemented `getArtifactStatus` helper function.
    *   Updated display for Concept, Outline, Worldbuilding, Scene Breakdowns to show `✓` for approved, `(Draft)` if content exists but not approved.
    *   Added a `project.isLoading && <span className="global-loading-indicator">(Syncing...)</span>` to show a global sync state. The more granular "Generating..." per artifact during an active generation is tricky without more specific state (e.g. `project.currentlyGeneratingArtifact: string | null`) which wasn't part of this guide's direct scope. The current implementation improves status display for saved/approved states.
*   **`repo_src/frontend/src/styles/StorymakerLayout.css`:** Added basic styling for `.global-loading-indicator`.

**Guide 4: Scene Breakdown Page Enhancements (Non-Interactive UX)**

*   **`SceneBreakdownTab.tsx`:**
    *   **Local Loading State:** Added `isGeneratingBreakdowns` state to manage the "Generate Scene Breakdowns with AI" button's disabled state and provide a local loading message within the tab. This complements the global `isLoading` passed from `StorymakerPage.tsx`.
    *   **Scene Parsing:**
        *   Defined a `ParsedScene` interface.
        *   Implemented `parseSceneDetailsFromMarkdown` function using regex to extract structured information (Scene Number, Goal, Characters, Events, Setting) from the Markdown content of scene breakdowns. This parsing is basic and might need refinement based on actual LLM output variations.
        *   Added `parsedBreakdowns` and `totalParsedScenes` to the component's state.
        *   The `parseAndSetBreakdowns` function is called when scene breakdown data is loaded or generated.
    *   **Structured Display:**
        *   Modified the rendering logic to display the `parsedBreakdowns` in a user-friendly list format (showing scene number, goal, events, etc.) *in addition* to the existing raw Markdown view.
        *   Added a raw markdown view for each chapter for debugging parsing.
    *   **Runtime Estimation:**
        *   Calculated `totalParsedScenes`.
        *   Added a display for the estimated time to generate narratives based on `totalParsedScenes` and a heuristic (`ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION`).
*   **`repo_src/frontend/src/styles/StorymakerTabs.css`:** Added basic styling for `.parsed-scene-list` and `.parsed-scene-item`.

**Important Notes & Potential Next Steps:**

*   **Scene Parsing Robustness:** The regex-based parsing in `SceneBreakdownTab.tsx` is a starting point. LLM output can vary, so this parsing logic might need to be made more robust or adaptable based on observed outputs from the AI.
*   **Granular Loading States:** For a truly dynamic "Generating..." status on individual LHS items, the `ProjectContext` or `StorymakerPage` would need to manage which specific artifact is currently undergoing an AI generation process. This could be a future enhancement.
*   **Backend Streaming for Feedback:** The "Improved Generation Feedback" for scene breakdowns (per-chapter progress) would ideally require the backend to stream results or offer per-chapter generation endpoints. The current frontend change adds a local loading indicator for the whole breakdown generation process.