Okay, I'll implement the requested changes. Here's the plan:

**1. UI Fixes for Left Panel:**
    *   Increase the width of the left panel.
    *   Ensure the collapse button correctly resizes the panel and that the main content area adjusts.
    *   Improve layout of items within the left panel so text and buttons are on the same line and well-spaced.

**2. Backend: Enhanced Scene Breakdown Parsing:**
    *   Modify `prompts.py` (`get_scene_breakdowns_prompt`) to instruct the LLM to return a JSON object. The JSON should have chapter titles as keys, and values as arrays of scene objects, each containing an `id` and `plan_markdown`.
    *   Update `core_logic.py` (`generate_all_scene_breakdowns_logic`) to expect and parse this JSON output from the LLM.
    *   Adjust `systemawriter_schemas.py` (`SceneBreakdownsResponseSchema`) to reflect the new JSON structure for `scene_breakdowns_by_chapter`.

**3. Frontend: `SceneBreakdownTab.tsx` Adaptation:**
    *   Update state and rendering logic to work with the new JSON structure for scene breakdowns received from the backend. The existing `JSON.parse` for `project.sceneBreakdowns.content` should handle this.
    *   The "Write this Scene" button will use the `id` and `plan_markdown` from the parsed JSON.

**4. Frontend: `SceneWritingTab.tsx` - Load Existing Scene Dropdown:**
    *   Add dropdowns to select a chapter and then a scene ID from that chapter.
    *   Populate these dropdowns based on the parsed scene breakdowns from `ProjectContext`.
    *   Selecting a scene will prefill the chapter, scene identifier, and scene plan fields.

**5. Frontend: `SceneWritingTab.tsx` - "Generate All Scenes" Button:**
    *   Add a "Generate All Scenes" button.
    *   This button will iterate through all scenes identified in the (now JSON-structured) scene breakdowns.
    *   For each scene, it will dispatch a request to the `generate-scene-narrative` API endpoint in parallel.
    *   Provide UI feedback for the progress of these parallel requests.
    *   Save successfully generated narratives to the `ProjectContext`.

Let's start implementing these changes.

```diff
--- a/repo_src/backend/data/systemawriter_schemas.py
+++ b/repo_src/backend/data/systemawriter_schemas.py
@@ -28,8 +28,13 @@
 class WorldbuildingResponseSchema(BaseModel):
     worldbuilding_md: str
 
+class SceneDetailSchema(BaseModel):
+    id: str  # e.g., "Scene 1.1", "Opening Scene"
+    plan_markdown: str # The detailed markdown plan for this specific scene
+
 class SceneBreakdownsResponseSchema(BaseModel):
-    scene_breakdowns_by_chapter: Dict[str, str] # Key: Chapter Title, Value: Markdown of scene breakdowns
+    # Key: Chapter Title, Value: List of scenes with their ID and markdown plan
+    scene_breakdowns_by_chapter: Dict[str, List[SceneDetailSchema]] 
 
 class SceneNarrativeResponseSchema(BaseModel):
     scene_narrative_md: str
--- a/repo_src/backend/systemawriter_logic/core_logic.py
+++ b/repo_src/backend/systemawriter_logic/core_logic.py
@@ -2,6 +2,7 @@
 from .llm_interface import ask_llm
 from . import prompts
 import re  # For parsing chapter titles from outline
+import json # For parsing JSON from LLM
 
 # Helper to simulate context processing if files were uploaded/referenced
 def _summarize_context_files(context_files_content: list[str]) -> str:
@@ -38,7 +39,7 @@
     approved_outline: str,
     approved_worldbuilding: str,
     context_files_content: list[str] = None  # context_summary not directly used in breakdown prompt but good to have
-) -> dict[str, str]:
+) -> dict: # Return type will be dict, which could be Dict[str, List[Dict[str,str]]] or Dict[str,str] for error
     chapters = _extract_chapters_from_outline(approved_outline)
     all_breakdowns = {}
 
@@ -56,9 +57,16 @@
             approved_worldbuilding=approved_worldbuilding,
             full_approved_outline=approved_outline
         )
-        breakdown_md_or_json = await ask_llm(prompt_text, system_message="You are an expert scene planner and story structure analyst.")
-        all_breakdowns[chapter["title"]] = breakdown_md_or_json
+        # LLM is now expected to return a JSON string for the scenes in this chapter
+        raw_llm_output = await ask_llm(prompt_text, system_message="You are an expert scene planner. Output valid JSON.")
+        try:
+            # The prompt asks for JSON for *this chapter's scenes*
+            # So the structure is List[Dict[str, str]]
+            parsed_scenes_for_chapter = json.loads(raw_llm_output)
+            all_breakdowns[chapter["title"]] = parsed_scenes_for_chapter
+        except json.JSONDecodeError:
+            print(f"Error: LLM did not return valid JSON for chapter '{chapter['title']}'. Raw output: {raw_llm_output}")
+            all_breakdowns[chapter["title"]] = [{"id": "error", "plan_markdown": f"Error: Could not parse scene details for this chapter. LLM output was not valid JSON. Raw: {raw_llm_output}"}]
     
     return all_breakdowns
 
--- a/repo_src/backend/systemawriter_logic/prompts.py
+++ b/repo_src/backend/systemawriter_logic/prompts.py
@@ -62,21 +62,32 @@
     Its summary from the overall outline is: "{chapter_summary_from_outline}"
 
 Reference the approved worldbuilding document and the full story outline for context.
-
-For each scene, provide the following in Markdown list format:
-- **Scene Number:** (e.g., Scene 1.1, Scene 1.2)
-- **Goal:** What this scene needs to achieve for the plot or character development.
-- **Characters Present:** List main characters involved.
-- **Key Events/Actions:** What happens in this scene? Be specific.
-- **Setting:** Where does this scene take place?
-- **Information Revealed (if any):** What new information does the audience or a character learn?
-- **Emotional Shift/Tone (Optional):** e.g., suspenseful, hopeful, tense.
-
+Generate a list of scenes for THIS CHAPTER ONLY.
 **Full Approved Story Outline:**
 {full_approved_outline}
 
 **Approved Worldbuilding Document:**
 {approved_worldbuilding}
+
+Output your response as a VALID JSON ARRAY of objects. Each object in the array represents a single scene and must have the following two keys:
+1. "id": A string identifier for the scene (e.g., "Scene 1.1", "The Confrontation").
+2. "plan_markdown": A string containing the detailed scene plan in Markdown format. The markdown should include:
+    - **Goal:** What this scene needs to achieve for the plot or character development.
+    - **Characters Present:** List main characters involved.
+    - **Key Events/Actions:** What happens in this scene? Be specific.
+    - **Setting:** Where does this scene take place?
+    - **Information Revealed (if any):** What new information does the audience or a character learn?
+    - **Emotional Shift/Tone (Optional):** e.g., suspenseful, hopeful, tense.
+
+Example of the JSON output format for a chapter with two scenes:
+[
+  {{
+    "id": "Scene 1.1: The Discovery",
+    "plan_markdown": "- **Goal:** Introduce the main character and the inciting incident.\\n- **Characters Present:** Elara.\\n- **Key Events/Actions:** Elara stumbles upon an ancient, glowing rune in the forbidden woods while foraging.\\n- **Setting:** The Whispering Woods, edge of the human settlement.\\n- **Information Revealed:** The existence of old magic.\\n- **Emotional Shift/Tone:** Curiosity, wonder, a hint of foreboding."
+  }},
+  {{
+    "id": "Scene 1.2: The Elder's Warning",
+    "plan_markdown": "- **Goal:** Establish conflict and stakes.\\n- **Characters Present:** Elara, Elder Maeve.\\n- **Key Events/Actions:** Elara shows the rune to Elder Maeve, who warns her of the dangers of old magic and the strict laws against it.\\n- **Setting:** Elder Maeve's hut.\\n- **Information Revealed:** The societal taboo against magic and potential consequences.\\n- **Emotional Shift/Tone:** Fear, determination."
+  }}
+]
 
-Generate the scene breakdown for Chapter "{chapter_title}" now:
+Generate the JSON array of scene plans for Chapter "{chapter_title}" now. Ensure the entire output is a single, valid JSON array.
 """
     return prompt
 
--- a/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/SceneBreakdownTab.tsx
@@ -3,20 +3,12 @@
 import { useProject } from '../../contexts/ProjectContext';
 import { generateSceneBreakdowns } from '../../services/systemaWriterService';
 
-interface ParsedScene {
-    sceneNumber?: string;
-    goal?: string;
-    charactersPresent?: string;
-    keyEvents?: string;
-    setting?: string;
-    informationRevealed?: string;
-    emotionalShift?: string;
-    rawContent: string; // Store the raw part of the markdown for this scene
+interface SceneDetail {
+    id: string;
+    plan_markdown: string;
 }
-
 interface SceneBreakdownTabProps {
     apiUrl: string;
-    isLoading: boolean; // Global loading state from parent
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
     onBreakdownsApproved: () => void;
@@ -24,11 +16,10 @@
 }
 
 const SceneBreakdownTab: React.FC<SceneBreakdownTabProps> = ({ apiUrl, isLoading: _isLoading, setIsLoading: _setIsLoading, setError, onBreakdownsApproved, onSelectSceneForWriting }) => {
-    const { project, updateArtifact, setProjectLoading } = useProject();
+    const { project, updateArtifact, setProjectLoading, isLoading: projectIsLoading } = useProject();
     const [isGeneratingBreakdowns, setIsGeneratingBreakdowns] = useState(false); // Local loading state for this tab
-    const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
-    const [parsedBreakdowns, setParsedBreakdowns] = useState<{[chapterTitle: string]: ParsedScene[]} | null>(null);
-    const [totalParsedScenes, setTotalParsedScenes] = useState(0);
+    // sceneBreakdownsData will now store the structured JSON directly
+    const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: SceneDetail[]} | null>(null);
     const [successMessage, setSuccessMessage] = useState<string | null>(null);
 
     useEffect(() => {
@@ -36,12 +27,10 @@
             try {
                 // Try to parse the stored content as JSON
                 const parsed = JSON.parse(project.sceneBreakdowns.content);
-                setSceneBreakdownsData(parsed);
-                parseAndSetBreakdowns(parsed);
+                setSceneBreakdownsData(parsed); // Directly use the parsed JSON
             } catch {
-                // If it's not JSON, treat it as a single markdown string
-                setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
-                parseAndSetBreakdowns({ "All Chapters": project.sceneBreakdowns.content });
+                // Handle case where content might not be valid JSON (e.g. old data or error)
+                setError("Error: Scene breakdowns are not in the expected format. Consider regenerating them.");
+                setSceneBreakdownsData(null);
             }
         }
     }, [project?.sceneBreakdowns.content]);
@@ -54,66 +43,12 @@
         }
     }, [successMessage]);
 
-    const parseSceneDetailsFromMarkdown = (markdown: string): ParsedScene[] => {
-        const scenes: ParsedScene[] = [];
-        // Split by lines and look for scene markers
-        const lines = markdown.split('\n');
-        let currentScene: ParsedScene | null = null;
-        let currentSceneLines: string[] = [];
-
-        for (const line of lines) {
-            const trimmedLine = line.trim();
-            
-            // Check if this line starts a new scene
-            if (trimmedLine.match(/^-\s*\*\*(Scene\s*(Number|ID|\d+))/i)) {
-                // Save previous scene if exists
-                if (currentScene) {
-                    currentScene.rawContent = currentSceneLines.join('\n');
-                    scenes.push(currentScene);
-                }
-                
-                // Start new scene
-                currentScene = { rawContent: '' };
-                currentSceneLines = [line];
-                
-                // Extract scene number from this line
-                const sceneMatch = trimmedLine.match(/Scene\s*(\d+(?:\.\d+)?|\w+)/i);
-                if (sceneMatch) {
-                    currentScene.sceneNumber = sceneMatch[0];
-                }
-            } else if (currentScene) {
-                // Add line to current scene
-                currentSceneLines.push(line);
-                
-                // Parse specific fields
-                const cleanLine = trimmedLine.replace(/^-\s*\*\*/, '').replace(/\*\*:?/, '');
-                if (cleanLine.toLowerCase().startsWith('goal')) {
-                    currentScene.goal = cleanLine.substring('goal'.length).replace(/^:\s*/, '').trim();
-                } else if (cleanLine.toLowerCase().startsWith('characters present')) {
-                    currentScene.charactersPresent = cleanLine.substring('characters present'.length).replace(/^:\s*/, '').trim();
-                } else if (cleanLine.toLowerCase().startsWith('key events')) {
-                    currentScene.keyEvents = cleanLine.substring('key events'.length).replace(/^[:/]\s*/, '').trim();
-                } else if (cleanLine.toLowerCase().startsWith('setting')) {
-                    currentScene.setting = cleanLine.substring('setting'.length).replace(/^:\s*/, '').trim();
-                } else if (cleanLine.toLowerCase().startsWith('information revealed')) {
-                    currentScene.informationRevealed = cleanLine.substring('information revealed'.length).replace(/^:\s*/, '').trim();
-                } else if (cleanLine.toLowerCase().startsWith('emotional shift')) {
-                    currentScene.emotionalShift = cleanLine.substring('emotional shift'.length).replace(/^[:/]\s*/, '').trim();
-                }
-            }
-        }
-        
-        // Don't forget the last scene
-        if (currentScene) {
-            currentScene.rawContent = currentSceneLines.join('\n');
-            scenes.push(currentScene);
-        }
-        
-        return scenes;
-    };
-
-    const parseAndSetBreakdowns = (data: {[chapterTitle: string]: string}) => {
-        const parsedData: {[chapterTitle: string]: ParsedScene[]} = {};
-        let totalScenes = 0;
-        for (const chapterTitle in data) {
-            const scenes = parseSceneDetailsFromMarkdown(data[chapterTitle]);
-            parsedData[chapterTitle] = scenes;
-            totalScenes += scenes.length;
-        }
-        setParsedBreakdowns(parsedData);
-        setTotalParsedScenes(totalScenes);
-    };
+    const getTotalParsedScenes = () => {
+        if (!sceneBreakdownsData) return 0;
+        return Object.values(sceneBreakdownsData).reduce((acc, scenes) => acc + scenes.length, 0);
+    };
+    
+    const totalParsedScenes = getTotalParsedScenes();
 
     const proceedWithGeneration = async () => {
         if (!project) return; // Should not happen if component is rendered
@@ -126,8 +61,7 @@
                 approved_worldbuilding_md: project.worldbuilding.content
             });
             setSceneBreakdownsData(data.scene_breakdowns_by_chapter);
-            // Store as JSON string in the project context
-            parseAndSetBreakdowns(data.scene_breakdowns_by_chapter);
+            // The project context now expects a JSON string
             updateArtifact('sceneBreakdowns', JSON.stringify(data.scene_breakdowns_by_chapter), false);
             setSuccessMessage("Scene breakdowns generated successfully! You can now approve them.");
         } catch (err: any) {
@@ -164,7 +98,7 @@
     };
 
     if (!project) return <p>Please create or load a project first.</p>;
-    if (!project.worldbuilding.content && !project.isLoading && !isGeneratingBreakdowns) {
+    if (!project.worldbuilding.content && !projectIsLoading && !isGeneratingBreakdowns) {
         return <p>Please complete the 'Worldbuilding' step before generating scene breakdowns.</p>;
     }
     const ESTIMATED_SECONDS_PER_NARRATIVE_GENERATION = 45; // e.g., 45 seconds per scene narrative
@@ -175,7 +109,7 @@
             <p>Generate detailed scene plans for each chapter. These will guide the individual scene writing process.</p>
             
             <div className="action-buttons">
-                <button onClick={handleGenerateSceneBreakdowns} disabled={project.isLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
+                <button onClick={handleGenerateSceneBreakdowns} disabled={projectIsLoading || isGeneratingBreakdowns || !project?.outline.content?.trim() || !project?.worldbuilding.content?.trim()}>
                     Generate Scene Breakdowns with AI
                 </button>
                 {sceneBreakdownsData && !project.sceneBreakdowns.isApproved && (
@@ -197,36 +131,30 @@
                 </div>
             )}
 
-            {parsedBreakdowns && !isGeneratingBreakdowns && (
+            {sceneBreakdownsData && !isGeneratingBreakdowns && (
                 <div style={{ marginTop: '20px' }}>
-                    {Object.entries(parsedBreakdowns).map(([chapterTitle, scenes]) => (
+                    {Object.entries(sceneBreakdownsData).map(([chapterTitle, scenes]) => (
                         <div key={chapterTitle} style={{ marginBottom: '30px' }}>
                             <h4>{chapterTitle}</h4>
-                            <div className="markdown-content" style={{ 
-                                border: '1px solid #444', 
-                                padding: '15px', 
-                                borderRadius: '5px',
-                                backgroundColor: 'var(--input-bg-color, #2a2a2a)'
-                            }}>
-                                <ReactMarkdown>{sceneBreakdownsData?.[chapterTitle] || ''}</ReactMarkdown>
-                            </div>
-                            <h5>Parsed Scenes:</h5>
+                            <h5>Scenes for {chapterTitle}:</h5>
                             {scenes.length > 0 ? (
                                 <ul className="parsed-scene-list">
                                     {scenes.map((scene, index) => (
                                         <li key={index} className="parsed-scene-item">
-                                            <strong>{scene.sceneNumber || `Scene ${index + 1}`}</strong>
-                                            {scene.goal && <p><strong>Goal:</strong> {scene.goal}</p>}
-                                            {scene.keyEvents && <p><strong>Events:</strong> {scene.keyEvents}</p>}
-                                            {scene.charactersPresent && <p><strong>Chars:</strong> {scene.charactersPresent}</p>}
-                                            {scene.setting && <p><strong>Setting:</strong> {scene.setting}</p>}
+                                            <strong>{scene.id}</strong>
+                                            <div className="markdown-content" style={{
+                                                maxHeight: '150px',
+                                                overflowY: 'auto',
+                                                padding: '5px',
+                                                backgroundColor: 'rgba(0,0,0,0.1)',
+                                                borderRadius: '4px',
+                                                marginTop: '5px'
+                                            }}>
+                                                <ReactMarkdown>{scene.plan_markdown}</ReactMarkdown>
+                                            </div>
                                             <button 
-                                                onClick={() => onSelectSceneForWriting(chapterTitle, scene.sceneNumber || `ParsedScene ${index+1}`, scene.rawContent)}
+                                                onClick={() => onSelectSceneForWriting(chapterTitle, scene.id, scene.plan_markdown)}
                                                 className="button-small button-write-scene"
-                                                disabled={project.isLoading}
+                                                disabled={projectIsLoading}
                                             >
                                                 Write this Scene ➔
                                             </button>
@@ -234,10 +162,6 @@
                                     ))}
                                 </ul>
                             ) : <p>No scenes parsed for this chapter. Check Markdown formatting.</p>}
-                             <div className="markdown-content-raw" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px dashed #555', padding: '10px', marginTop:'10px' }}>
-                                <h5>Raw Markdown for {chapterTitle} (for debugging parsing)</h5>
-                                <pre style={{whiteSpace: 'pre-wrap', fontSize:'0.8em'}}>{sceneBreakdownsData?.[chapterTitle] || ''}</pre>
-                            </div>
                         </div>
                     ))}
                 </div>
--- a/repo_src/frontend/src/components/systemawriter/SceneWritingTab.tsx
+++ b/repo_src/frontend/src/components/systemawriter/SceneWritingTab.tsx
@@ -4,11 +4,15 @@
 import { useProject } from '../../contexts/ProjectContext';
 import { generateSceneNarrative } from '../../services/systemaWriterService';
 
+interface SceneDetail {
+    id: string;
+    plan_markdown: string;
+}
+
 interface SceneWritingTabProps {
     apiUrl: string;
-    isLoading: boolean;
     setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
     setError: React.Dispatch<React.SetStateAction<string | null>>;
     initialSceneDetails?: {chapterTitle: string, sceneIdentifier: string, scenePlan?: string} | null;
     setInitialSceneDetails?: React.Dispatch<React.SetStateAction<{chapterTitle: string, sceneIdentifier: string, scenePlan?: string} | null>>;
 }
@@ -16,12 +20,13 @@
 const SceneWritingTab: React.FC<SceneWritingTabProps> = ({ 
     apiUrl, 
-    isLoading, 
     setIsLoading, 
     setError, 
     initialSceneDetails,
     setInitialSceneDetails
 }) => {
-    const { project, updateSceneNarrative, getSceneNarrative } = useProject();
+    const { project, updateSceneNarrative, getSceneNarrative, isLoading: projectIsLoading, setProjectLoading } = useProject();
+    // sceneBreakdownsData will store the structured JSON from project context
     const [sceneBreakdownsData, setSceneBreakdownsData] = useState<{[chapterTitle: string]: string} | null>(null);
     const [selectedChapter, setSelectedChapter] = useState<string>('');
     const [sceneIdentifier, setSceneIdentifier] = useState<string>('');
@@ -31,17 +36,20 @@
     const [editedNarrative, setEditedNarrative] = useState<string>('');
     const [isEditingNarrative, setIsEditingNarrative] = useState<boolean>(false);
     const [successMessage, setSuccessMessage] = useState<string | null>(null);
+    const [allScenesToGenerate, setAllScenesToGenerate] = useState<Array<{chapter: string, id: string, plan: string}>>([]);
+    const [generatingAllProgress, setGeneratingAllProgress] = useState<{current: number, total: number} | null>(null);
 
     // Parse scene breakdowns from project
     useEffect(() => {
         if (project && project.sceneBreakdowns.content) {
             try {
                 const parsed = JSON.parse(project.sceneBreakdowns.content);
-                setSceneBreakdownsData(parsed);
+                setSceneBreakdownsData(parsed); // This will be {[chapter: string]: SceneDetail[]}
             } catch {
-                setSceneBreakdownsData({ "All Chapters": project.sceneBreakdowns.content });
+                setError("Error: Scene breakdowns are not in the expected JSON format. Please regenerate them.");
+                setSceneBreakdownsData(null);
             }
         }
     }, [project?.sceneBreakdowns.content]);
-
     // Handle initial scene details (when editing from left panel)
     useEffect(() => {
         if (initialSceneDetails) {
@@ -53,7 +61,9 @@
                 setEditedNarrative(existingScene.content);
                 setGeneratedNarrative(existingScene.content);
                 setIsEditingNarrative(true);
-                // If scenePlan was passed in initialSceneDetails (from breakdown tab)
-                // and no existing plan is loaded or if this is a fresh navigation.
-                if (initialSceneDetails.scenePlan && (!scenePlan || generatedNarrative === '')) setScenePlan(initialSceneDetails.scenePlan);
+            }
+            // Always set the scene plan if provided from initialSceneDetails,
+            // as this comes from the "Write this Scene" button on Breakdown tab
+            if (initialSceneDetails.scenePlan) {
+                setScenePlan(initialSceneDetails.scenePlan);
             }
             
             // Clear the initial scene details after loading
@@ -69,13 +79,26 @@
         }
     }, [successMessage]);
 
+    // Populate available scenes for dropdowns
+    useEffect(() => {
+        if (sceneBreakdownsData) {
+            const scenes: Array<{chapter: string, id: string, plan: string}> = [];
+            for (const chapter in sceneBreakdownsData) {
+                (sceneBreakdownsData[chapter] as unknown as SceneDetail[]).forEach(scene => { // Cast needed due to initial state type
+                    scenes.push({ chapter, id: scene.id, plan: scene.plan_markdown });
+                });
+            }
+            setAllScenesToGenerate(scenes);
+        }
+    }, [sceneBreakdownsData]);
+
     const proceedWithGeneration = async () => {
         if (!project) return;
         setIsLoading(true);
         setError(null);
         try {
-            const fullChapterBreakdown = sceneBreakdownsData?.[selectedChapter] || '';
-            const data = await generateSceneNarrative(apiUrl, {
+            const chapterBreakdowns = sceneBreakdownsData?.[selectedChapter] || [];
+            const fullChapterBreakdown = chapterBreakdowns.map(s => `Scene: ${s.id}\n${s.plan_markdown}`).join("\n\n---\n\n");            const data = await generateSceneNarrative(apiUrl, {
                 scene_plan_from_breakdown: scenePlan,
                 chapter_title: selectedChapter,
                 full_chapter_scene_breakdown: fullChapterBreakdown,
@@ -103,7 +126,7 @@
             setError("Cannot save scene: missing chapter, identifier, or narrative content.");
             return;
         }        
-        if (isLoading) {
+        if (projectIsLoading) {
             setError("Cannot save while another operation is in progress.");
             return;
         }
@@ -137,11 +160,54 @@
         }
     };
 
+    const handleGenerateAllScenes = async () => {
+        if (!project || allScenesToGenerate.length === 0) {
+            setError("No scenes available to generate or project not loaded.");
+            return;
+        }
+        setProjectLoading(true); // Use project context's global loading
+        setIsLoading(true); // Also set local loading for button disabling
+        setError(null);
+        setGeneratingAllProgress({ current: 0, total: allScenesToGenerate.length });
+
+        const results = await Promise.allSettled(
+            allScenesToGenerate.map(async (scene, index) => {
+                const chapterBreakdowns = sceneBreakdownsData?.[scene.chapter] || [];
+                const fullChapterBreakdown = chapterBreakdowns.map(s => `Scene: ${s.id}\n${s.plan_markdown}`).join("\n\n---\n\n");
+                const narrativeData = await generateSceneNarrative(apiUrl, {
+                    scene_plan_from_breakdown: scene.plan,
+                    chapter_title: scene.chapter,
+                    full_chapter_scene_breakdown: fullChapterBreakdown,
+                    approved_worldbuilding_md: project.worldbuilding.content,
+                    full_approved_outline_md: project.outline.content,
+                    writing_style_notes: writingStyleNotes || "Write in an engaging narrative style."
+                });
+                updateSceneNarrative({
+                    content: narrativeData.scene_narrative_md,
+                    isApproved: true,
+                    lastModified: new Date(),
+                    sceneIdentifier: scene.id,
+                    chapterTitle: scene.chapter,
+                    sceneOrderHeuristic: parseFloat(scene.id.match(/\d+\.?\d*/)?.[0] || `${index + 999}`),
+                });
+                setGeneratingAllProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
+                return { sceneId: scene.id, status: 'fulfilled' };
+            })
+        );
+
+        setProjectLoading(false);
+        setIsLoading(false);
+        setGeneratingAllProgress(null);
+        const failedCount = results.filter(r => r.status === 'rejected').length;
+        setSuccessMessage(`Generated ${allScenesToGenerate.length - failedCount} scenes. ${failedCount > 0 ? `${failedCount} failed.` : ''}`);
+    };
+
     if (!project) return <p>Please create or load a project first.</p>;
-    if (!project.sceneBreakdowns.content && !isLoading) {
+    if (!project.sceneBreakdowns.content && !projectIsLoading) {
         return <p>Please complete the 'Scene Breakdowns' step before writing scenes.</p>;
     }    
 
     const savedScenesCount = project.sceneNarratives.length;
+    const chapterNames = sceneBreakdownsData ? Object.keys(sceneBreakdownsData) : [];
 
     return (
         <div className="step-card">
@@ -154,31 +220,39 @@
                 </div>
             )}
 
-            <div style={{ marginBottom: '20px' }}>
-                <h3>Select Chapter:</h3>
+            {/* Dropdown for selecting scene */}
+            <div style={{ marginBottom: '20px' }} className="scene-selection-group">
+                <label htmlFor="chapterSelect">Chapter:</label>
                 <select 
+                    id="chapterSelect"
                     value={selectedChapter} 
-                    onChange={(e) => setSelectedChapter(e.target.value)}
+                    onChange={(e) => {
+                        setSelectedChapter(e.target.value);
+                        setSceneIdentifier(''); // Reset scene ID when chapter changes
+                        setScenePlan('');
+                        setGeneratedNarrative('');
+                        setEditedNarrative('');
+                    }}
                     style={{ width: '100%', padding: '8px' }}
                 >
                     <option value="">-- Select a Chapter --</option>
-                    {sceneBreakdownsData && Object.keys(sceneBreakdownsData).map(chapter => (
+                    {chapterNames.map(chapter => (
                         <option key={chapter} value={chapter}>{chapter}</option>
                     ))}
                 </select>
-            </div>
-
-            {selectedChapter && sceneBreakdownsData && (
-                <div style={{ marginBottom: '20px' }}>
-                    <h3>Chapter Breakdown: {selectedChapter}</h3>
-                    <div style={{ 
-                        border: '1px solid #444', 
-                        padding: '15px', 
-                        borderRadius: '5px',
-                        backgroundColor: 'var(--input-bg-color, #2a2a2a)',
-                        maxHeight: '300px',
-                        overflowY: 'auto'
-                    }}>
-                        <ReactMarkdown>{sceneBreakdownsData[selectedChapter]}</ReactMarkdown>
+
+                {selectedChapter && sceneBreakdownsData && (sceneBreakdownsData[selectedChapter] as unknown as SceneDetail[])?.length > 0 && (
+                    <div style={{ marginTop: '10px' }}>
+                        <label htmlFor="sceneSelect">Scene:</label>
+                        <select
+                            id="sceneSelect"
+                            value={sceneIdentifier}
+                            onChange={(e) => {
+                                const sceneId = e.target.value;
+                                setSceneIdentifier(sceneId);
+                                const scene = (sceneBreakdownsData[selectedChapter] as unknown as SceneDetail[]).find(s => s.id === sceneId);
+                                setScenePlan(scene ? scene.plan_markdown : '');
+                                handleLoadExistingScene(); // Attempt to load if exists
+                            }}
+                            style={{ width: '100%', padding: '8px' }}
+                        >
+                            <option value="">-- Select a Scene --</option>
+                            {(sceneBreakdownsData[selectedChapter] as unknown as SceneDetail[]).map(scene => (
+                                <option key={scene.id} value={scene.id}>{scene.id}</option>
+                            ))}
+                        </select>
                     </div>
-                </div>
+                )}
             )}
 
             <div style={{ marginBottom: '20px' }}>
@@ -200,7 +274,7 @@
 
                 <div style={{ marginBottom: '10px' }}>
                     <label htmlFor="scenePlan">Scene Plan (copy from breakdown above):</label>
-                    <textarea
+                    <textarea // This textarea should be pre-filled by dropdown, but still editable
                         id="scenePlan"
                         value={scenePlan}
                         onChange={(e) => setScenePlan(e.target.value)}
@@ -223,10 +297,19 @@
 
                 <button 
                     onClick={handleGenerateNarrative} 
-                    disabled={isLoading || !selectedChapter || !sceneIdentifier.trim() || !scenePlan.trim() || !project.worldbuilding.content.trim() || !project.outline.content.trim()}
+                    disabled={projectIsLoading || !selectedChapter || !sceneIdentifier.trim() || !scenePlan.trim() || !project.worldbuilding.content.trim() || !project.outline.content.trim()}
                 >
                     Generate Scene Narrative
                 </button>
+                <button
+                    onClick={handleGenerateAllScenes}
+                    disabled={projectIsLoading || allScenesToGenerate.length === 0 || !project.worldbuilding.content.trim() || !project.outline.content.trim()}
+                    style={{backgroundColor: 'var(--accent-color-secondary)', color: 'white'}}
+                >
+                    Generate All Scenes ({allScenesToGenerate.length})
+                </button>
+                {generatingAllProgress && 
+                    <p>Generating all scenes... {generatingAllProgress.current}/{generatingAllProgress.total}</p>}
             </div>
 
             {(generatedNarrative || editedNarrative) && (
@@ -247,7 +330,7 @@
                                 <button onClick={() => setIsEditingNarrative(false)}>
                                     Preview
                                 </button>
-                                <button onClick={handleGenerateNarrative} disabled={isLoading}>
+                                <button onClick={handleGenerateNarrative} disabled={projectIsLoading}>
                                     Regenerate
                                 </button>
                             </div>
--- a/repo_src/frontend/src/pages/SystemaWriterPage.tsx
+++ b/repo_src/frontend/src/pages/SystemaWriterPage.tsx
@@ -94,9 +94,9 @@
             case 'worldbuilding':
                 return <WorldbuildingTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} onWorldbuildingApproved={() => {}} />;
             case 'scene_breakdowns':
-                return <SceneBreakdownTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} onSelectSceneForWriting={handleSelectSceneForWriting} />;
+                return <SceneBreakdownTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} onBreakdownsApproved={() => {}} onSelectSceneForWriting={handleSelectSceneForWriting} />;
             case 'scene_writing':
-                return <SceneWritingTab apiUrl={apiUrl} isLoading={project?.isLoading || isLoading} setIsLoading={setIsLoading} setError={setError} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
+                return <SceneWritingTab apiUrl={apiUrl} setIsLoading={setIsLoading} setError={setError} initialSceneDetails={editingSceneDetails} setInitialSceneDetails={setEditingSceneDetails} />;
             case 'full_story_review':
                 return <FullStoryReviewTab apiUrl={apiUrl} isLoading={isLoading} setIsLoading={setIsLoading} setError={setError} />;
             default:
--- a/repo_src/frontend/src/styles/StorymakerLayout.css
+++ b/repo_src/frontend/src/styles/StorymakerLayout.css
@@ -8,8 +8,8 @@
 }
 
 .left-panel {
-    width: 280px;
-    min-width: 220px;
+    width: 350px; /* Increased width */
+    min-width: 250px; /* Adjusted min-width */
     background-color: var(--card-bg-color, #2f2f2f);
     padding: 15px;
     overflow-y: auto;
@@ -48,12 +48,20 @@
     justify-content: space-between;
     align-items: center;
     font-size: 0.95em;
+    line-height: 1.4; /* Ensure enough height for text and buttons */
+}
+
+.left-panel-item > span:first-child { /* Target the text span */
+    flex-grow: 1; /* Allow text to take available space */
+    margin-right: 8px; /* Space between text and buttons */
+    overflow: hidden; /* Prevent long text from breaking layout */
+    text-overflow: ellipsis;
+    white-space: nowrap;
 }
 
 .left-panel-item:hover {
     background-color: var(--hover-bg-color, #3a3a3a);
 }
-
 .left-panel-item.active {
     background-color: var(--accent-color, #64cfff);
     color: var(--button-primary-text, #000);
@@ -66,7 +74,6 @@
     border-color: var(--button-primary-text, #000);
 }
 
-
 .edit-btn-small, .remove-btn-small, .add-doc-btn-small {
     background: none;
     border: 1px solid var(--text-color-muted, #aaa);
@@ -76,6 +83,7 @@
     border-radius: 3px;
     cursor: pointer;
     margin-left: 5px;
+    flex-shrink: 0; /* Prevent buttons from shrinking */
 }
 .edit-btn-small:hover, .remove-btn-small:hover, .add-doc-btn-small:hover {
     background-color: var(--hover-bg-color, #3a3a3a);
@@ -129,6 +137,10 @@
     display: flex; /* Allow tabs nav and tab content to stack vertically */
     flex-direction: column; /* Stack nav on top of content */
 }
+.main-content-area.panel-collapsed {
+    /* Styles when panel is collapsed, if specific adjustments are needed for main content */
+    /* For example, if you had fixed widths and wanted to adjust margins */
+}
 
 .collapse-btn-container {
     text-align: right;
--- a/repo_src/frontend/src/styles/StorymakerTabs.css
+++ b/repo_src/frontend/src/styles/StorymakerTabs.css
@@ -86,3 +86,11 @@
 .button-write-scene:hover {
     background-color: var(--accent-color-secondary-hover, #45a049) !important;
 }
+
+/* For SceneWritingTab scene selection dropdowns */
+.scene-selection-group label {
+    display: block;
+    margin-top: 10px;
+    margin-bottom: 5px;
+    font-weight: bold;
+}
```