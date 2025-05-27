Okay, let's implement these phases. We'll primarily focus on frontend updates to `SystemaWriterPage.tsx` to manage the new states and UI flow for scene decomposition, selection, generation, and basic revision (manual editing + regeneration with style notes).

The backend API endpoints and core logic for these steps are largely in place from the previous implementations. The main effort will be to orchestrate this on the frontend.

**Recap of Phases to Implement:**

*   **Phase 3: Scene Decomposition (AI-Assisted)**
    *   User triggers generation of scene breakdowns per chapter after approving worldbuilding.
    *   Frontend displays these breakdowns.
*   **Phase 4: Scene Generation (AI-Driven, User-Initiated)**
    *   User selects (or effectively provides the plan for) a specific scene from the breakdowns.
    *   User initiates generation of narrative for that scene.
    *   Frontend displays the generated narrative.
*   **Phase 5: Revision & Refinement (Simplified for this iteration)**
    *   **Manual Editing:** User can edit the generated scene narrative directly in a textarea.
    *   **Targeted Regeneration:** User can re-trigger generation of the *current* scene with (potentially new) writing style notes.

**Frontend Changes (`SystemaWriterPage.tsx`):**

We'll introduce new states and refine the `currentStep` logic to manage this more granular flow.

```diff
--- a/repo_src/frontend/src/pages/SystemaWriterPage.tsx
+++ b/repo_src/frontend/src/pages/SystemaWriterPage.tsx
@@ -10,12 +10,14 @@
 
 type CurrentStep = 
     | 'concept' 
     | 'outline' 
     | 'worldbuilding' 
-    | 'scene_breakdowns' 
-    | 'scene_narrative';
+    | 'scene_breakdowns_display'  // Displaying all breakdowns
+    | 'scene_narrative_setup'     // Setting up for a specific scene generation
+    | 'scene_narrative_review';   // Reviewing/editing/regenerating a specific scene
 
 interface SceneBreakdownData {
     [chapterTitle: string]: string; // Markdown for each chapter's breakdown
 }
 
-interface SceneToGenerate {
+interface ActiveSceneDetails { // Renamed from SceneToGenerate for clarity
     chapterTitle: string;
-    scenePlan: string; // The specific plan for this one scene
-    fullChapterBreakdown: string; // Full breakdown for its chapter
+    fullChapterBreakdownMd: string; // Full breakdown for its chapter
+    scenePlanInput: string; // User input/copy-pasted plan for the specific scene
 }
 
 const SystemaWriterPage: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
@@ -33,11 +35,10 @@
     const [approvedWorldbuilding, setApprovedWorldbuilding] = useState('');
 
     const [generatedSceneBreakdowns, setGeneratedSceneBreakdowns] = useState<SceneBreakdownData | null>(null);
-    // For simplicity, direct approval of breakdowns as a whole for v0.1. 
-    // Individual scene editing/approval would be more complex.
     
-    const [sceneToGenerate, setSceneToGenerate] = useState<SceneToGenerate | null>(null);
+    const [activeSceneDetails, setActiveSceneDetails] = useState<ActiveSceneDetails | null>(null);
     const [generatedSceneNarrative, setGeneratedSceneNarrative] = useState('');
+    const [editedSceneNarrative, setEditedSceneNarrative] = useState(''); // For user edits
     
     const [writingStyleNotes, setWritingStyleNotes] = useState('');
 
@@ -86,7 +87
                 approved_worldbuilding_md: approvedWorldbuilding
             });
             setGeneratedSceneBreakdowns(data.scene_breakdowns_by_chapter);
-            setCurrentStep('scene_breakdowns');
+            setCurrentStep('scene_breakdowns_display');
         } catch (err: any) {
             setError(err.message || "Failed to generate scene breakdowns.");
         } finally {
@@ -94,49 +94,40 @@
         }
     };
     
-    // Helper to parse individual scene plans from a chapter's breakdown markdown
-    // This is a simplification; robust parsing might need more complex logic or backend support
-    const extractScenePlans = (chapterBreakdownMd: string): string[] => {
-        if (!chapterBreakdownMd) return [];
-        // Assuming scenes start with "- **Scene Number:**" or similar identifiable pattern
-        const scenes = chapterBreakdownMd.split(/\n-\s*\*\*(Scene Number|Scene \d+\.\d+):\*\*/i);
-        return scenes.slice(1).map((s, i) => i % 2 === 0 ? `- **Scene...` : s.trim()).filter(s => s.length > 10); // very rough
-    };
-
-
-    const handleSelectSceneForNarrative = (chapterTitle: string, sceneIndex: number, fullChapterBreakdown: string) => {
-        // This is a placeholder. A more robust way to get individual scene plans is needed.
-        // For now, let's assume the user will copy-paste or we send a chunk.
-        // For v0.1, we might just send the chapter breakdown and ask LLM for a specific scene *within* it.
-        // Or, the UI would present selectable scene plans.
-        
-        // Simplified: Let user pick from breakdown, or type/paste the scene plan.
-        // For actual generation, the `scene_plan_from_breakdown` field is critical.
-        // Here, we'll set up a basic structure; UI needs refinement for scene selection.
-        const scenePlanPlaceholder = `Plan for scene ${sceneIndex + 1} of chapter "${chapterTitle}" (User should provide this or select from a parsed list)`;
-        
-        // A better approach would be for the backend to return structured scene plans.
-        // For now, let's assume the user identifies the scene plan from the displayed markdown.
-        const plan = prompt(`Enter/paste the specific plan for the scene you want to generate from chapter "${chapterTitle}":\n(Find this in the scene breakdown text shown)`, 
-                            `Example: - Goal: Introduce the villain... - Characters: Hero, Villain...`);
-        if (!plan) return;
-
-        setSceneToGenerate({
+    const handleSetupSceneNarrative = (chapterTitle: string, fullChapterBreakdownMd: string) => {
+        setActiveSceneDetails({
             chapterTitle,
-            scenePlan: plan,
-            fullChapterBreakdown
+            fullChapterBreakdownMd,
+            scenePlanInput: "" // User will fill this
         });
         setGeneratedSceneNarrative(''); // Clear previous narrative
-        setCurrentStep('scene_narrative'); // Move to narrative step (which will now show input for plan if not already set)
+        setEditedSceneNarrative('');
+        setCurrentStep('scene_narrative_setup');
     };
 
 
     const handleGenerateSceneNarrative = async () => {
-        if (!sceneToGenerate || !sceneToGenerate.scenePlan.trim()) {
+        if (!activeSceneDetails || !activeSceneDetails.scenePlanInput.trim()) {
             setError("Scene plan to generate is missing or empty.");
             return;
         }
         if (!approvedOutline.trim() || !approvedWorldbuilding.trim()) {
             setError("Approved outline or worldbuilding is missing.");
             return;
         }
         setIsLoading(true);
         setError(null);
         try {
             const data = await generateSceneNarrative(apiUrl, {
-                scene_plan_from_breakdown: sceneToGenerate.scenePlan,
-                chapter_title: sceneToGenerate.chapterTitle,
-                full_chapter_scene_breakdown: sceneToGenerate.fullChapterBreakdown,
+                scene_plan_from_breakdown: activeSceneDetails.scenePlanInput,
+                chapter_title: activeSceneDetails.chapterTitle,
+                full_chapter_scene_breakdown: activeSceneDetails.fullChapterBreakdownMd,
                 approved_worldbuilding_md: approvedWorldbuilding,
                 full_approved_outline_md: approvedOutline,
                 writing_style_notes: writingStyleNotes || undefined
             });
             setGeneratedSceneNarrative(data.scene_narrative_md);
-            // User can then copy this, or we can add "save" or "add to story" features later.
+            setEditedSceneNarrative(data.scene_narrative_md); // Initialize editor with new generation
+            setCurrentStep('scene_narrative_review');
         } catch (err: any) {
             setError(err.message || "Failed to generate scene narrative.");
         } finally {
@@ -196,41 +187,36 @@
                 </div>
             )}
 
-            {currentStep === 'scene_breakdowns' && generatedSceneBreakdowns && (
+            {currentStep === 'scene_breakdowns_display' && generatedSceneBreakdowns && (
                 <div className="step-card">
-                    <h2>Step 4: Review Scene Breakdowns & Select Scene for Narrative</h2>
-                    <p>Below are scene breakdowns for each chapter. Review them. To generate a narrative for a specific scene, you'll need its plan.</p>
+                    <h2>Step 4: Review Scene Breakdowns</h2>
+                    <p>Below are AI-generated scene breakdowns for each chapter. Review them. To write a scene, select a chapter and you'll be prompted to provide the specific scene plan from the breakdown.</p>
                     {Object.entries(generatedSceneBreakdowns).map(([chapterTitle, breakdownMd]) => (
                         <div key={chapterTitle} className="chapter-breakdown">
                             <h3>{chapterTitle}</h3>
                             <ReactMarkdown>{breakdownMd}</ReactMarkdown>
-                            {/* For v0.1, scene selection is simplified via prompt.
-                                A better UI would parse scenes and make them individually clickable. */}
                             <button 
-                                onClick={() => handleSelectSceneForNarrative(chapterTitle, 0, breakdownMd)}
+                                onClick={() => handleSetupSceneNarrative(chapterTitle, breakdownMd)}
                                 disabled={isLoading}
-                                title={`You will be prompted to provide the specific scene plan from the breakdown above for chapter: ${chapterTitle}`}
                                 >
-                                Generate Narrative for a Scene in "{chapterTitle}"...
+                                Work on a scene in "{chapterTitle}" &raquo;
                             </button>
                         </div>
                     ))}
                     <button onClick={() => setCurrentStep('worldbuilding')}>&laquo; Back to Worldbuilding</button>
                 </div>
             )}
-            
-            {currentStep === 'scene_narrative' && sceneToGenerate && (
+
+            {currentStep === 'scene_narrative_setup' && activeSceneDetails && (
                 <div className="step-card">
-                    <h2>Step 5: Generate Scene Narrative</h2>
-                    <p>Generating narrative for a scene in chapter: <strong>{sceneToGenerate.chapterTitle}</strong></p>
+                    <h2>Step 5a: Setup Scene Narrative Generation</h2>
+                    <p>For chapter: <strong>{activeSceneDetails.chapterTitle}</strong></p>
+                    <p>Please copy the specific plan for ONE scene from the chapter breakdown (displayed in the previous step or viewable if you go back) and paste it into the textarea below.</p>
                     <div>
                         <label htmlFor="scenePlanInput">Specific Scene Plan (from breakdown):</label>
                         <textarea
                             id="scenePlanInput"
-                            value={sceneToGenerate.scenePlan}
-                            onChange={(e) => setSceneToGenerate(prev => prev ? {...prev, scenePlan: e.target.value} : null)}
+                            value={activeSceneDetails.scenePlanInput}
+                            onChange={(e) => setActiveSceneDetails(prev => prev ? {...prev, scenePlanInput: e.target.value} : null)}
                             rows={8}
                             placeholder="Paste or type the specific plan for the scene to be written here..."
                             disabled={isLoading}
@@ -247,20 +233,42 @@
                             disabled={isLoading}
                         />
                     </div>
-                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !sceneToGenerate.scenePlan.trim()}>
+                    <button onClick={() => setCurrentStep('scene_breakdowns_display')}>&laquo; Back to Scene Breakdowns</button>
+                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !activeSceneDetails.scenePlanInput.trim()}>
                         Generate Scene Narrative
                     </button>
+                </div>
+            )}
+
+            {currentStep === 'scene_narrative_review' && activeSceneDetails && (
+                <div className="step-card">
+                    <h2>Step 5b: Review, Edit & Regenerate Scene Narrative</h2>
+                    <p>Scene in chapter: <strong>{activeSceneDetails.chapterTitle}</strong></p>
+                    <div>
+                        <h4>Original Scene Plan Used:</h4>
+                        <ReactMarkdown>{activeSceneDetails.scenePlanInput}</ReactMarkdown>
+                    </div>
+                     <div>
+                        <label htmlFor="editedSceneNarrative">Edit Generated Narrative:</label>
+                        <textarea
+                            id="editedSceneNarrative"
+                            value={editedSceneNarrative}
+                            onChange={(e) => setEditedSceneNarrative(e.target.value)}
+                            rows={20}
+                            disabled={isLoading}
+                        />
+                    </div>
+                     <div>
+                        <label htmlFor="writingStyleNotesRegen">Writing Style Notes (for regeneration):</label>
+                        <input 
+                            type="text"
+                            id="writingStyleNotesRegen"
+                            value={writingStyleNotes} // Reuses the same state for simplicity
+                            onChange={(e) => setWritingStyleNotes(e.target.value)}
+                            placeholder="e.g., More suspense, focus on inner thoughts"
+                            disabled={isLoading}
+                        />
+                    </div>
+                    <button onClick={() => { setCurrentStep('scene_breakdowns_display'); setActiveSceneDetails(null); setGeneratedSceneNarrative(''); setEditedSceneNarrative(''); }}>
+                        &laquo; Back to Scene Breakdowns
+                    </button>
+                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !activeSceneDetails.scenePlanInput.trim()}>
+                        Regenerate Scene
+                    </button>
                     
                     {generatedSceneNarrative && (
                         <div className="generated-content-preview" style={{marginTop: '20px'}}>
                             <h3>Generated Scene Narrative:</h3>
                             <ReactMarkdown>{generatedSceneNarrative}</ReactMarkdown>
                         </div>
                     )}
-                    <button onClick={() => { setCurrentStep('scene_breakdowns_display'); setSceneToGenerate(null); setGeneratedSceneNarrative(''); }}>
-                        &laquo; Back to Scene Breakdowns
-                    </button>
                 </div>
             )}
 
```

**Explanation of Frontend Changes in `SystemaWriterPage.tsx`:**

1.  **`CurrentStep` Refined:**
    *   `scene_breakdowns` split into `scene_breakdowns_display` (showing all breakdowns) and `scene_narrative_setup` (preparing for a single scene generation) and `scene_narrative_review` (editing/regenerating).

2.  **State Variables:**
    *   `SceneToGenerate` interface renamed to `ActiveSceneDetails` for clarity.
    *   `activeSceneDetails: ActiveSceneDetails | null`: Holds context for the scene currently being worked on (chapter title, full chapter breakdown MD, and the *user-inputted plan* for the specific scene).
    *   `editedSceneNarrative: string`: New state to hold the narrative text in a textarea for user editing. Initialized with `generatedSceneNarrative`.

3.  **Workflow for Scene Decomposition (Phase 3):**
    *   Button "Approve Worldbuilding & Generate Scene Breakdowns" now calls `handleGenerateSceneBreakdowns`.
    *   On success, `generatedSceneBreakdowns` is populated, and `currentStep` becomes `scene_breakdowns_display`.
    *   The UI in `scene_breakdowns_display` iterates through `generatedSceneBreakdowns` (chapter by chapter).
    *   Each chapter section has a button: "Work on a scene in '{chapterTitle}' »".

4.  **Workflow for Scene Selection & Setup (Transition to Phase 4):**
    *   Clicking "Work on a scene in '{chapterTitle}' »" calls `handleSetupSceneNarrative(chapterTitle, breakdownMd)`.
    *   `handleSetupSceneNarrative`:
        *   Sets `activeSceneDetails` with the `chapterTitle` and the `fullChapterBreakdownMd`.
        *   Clears `activeSceneDetails.scenePlanInput` (user needs to provide this).
        *   Clears `generatedSceneNarrative` and `editedSceneNarrative`.
        *   Sets `currentStep` to `scene_narrative_setup`.
    *   UI for `scene_narrative_setup`:
        *   Displays the chapter title.
        *   Provides a textarea for the user to paste the *specific scene plan* (copied from the breakdown displayed in the previous step). This is bound to `activeSceneDetails.scenePlanInput`.
        *   Input for `writingStyleNotes`.
        *   Button "Generate Scene Narrative".

5.  **Workflow for Scene Generation (Phase 4) & Review/Edit (Phase 5):**
    *   "Generate Scene Narrative" button in `scene_narrative_setup` calls `handleGenerateSceneNarrative`.
    *   `handleGenerateSceneNarrative`:
        *   Uses `activeSceneDetails.scenePlanInput` as `scene_plan_from_breakdown`.
        *   Uses `activeSceneDetails.chapterTitle` and `activeSceneDetails.fullChapterBreakdownMd`.
        *   On successful generation:
            *   Sets `generatedSceneNarrative` (for raw display if needed).
            *   Sets `editedSceneNarrative` with the new generation (populating the textarea).
            *   Sets `currentStep` to `scene_narrative_review`.
    *   UI for `scene_narrative_review`:
        *   Displays the chapter title and the `activeSceneDetails.scenePlanInput` (read-only) for reference.
        *   Textarea bound to `editedSceneNarrative` for manual edits.
        *   Input for `writingStyleNotes` (can be changed for regeneration).
        *   Button "Regenerate Scene": This calls `handleGenerateSceneNarrative` again, using the *original* `activeSceneDetails.scenePlanInput` but the *current* `writingStyleNotes`. This allows iterative refinement of the generation based on the same plan.
        *   Button "« Back to Scene Breakdowns": Resets states related to the current scene and returns to `scene_breakdowns_display`.
        *   The originally generated `generatedSceneNarrative` is still displayed via `<ReactMarkdown>` for comparison or if the user wants to revert their edits manually.

**Backend Considerations (No changes needed for this frontend update):**

*   The backend `generate_scene_breakdowns` endpoint returns Markdown per chapter. The frontend now guides the user to pick a chapter and then manually provide the specific scene plan from that Markdown. A future improvement could be for the backend to parse its own breakdown output and return a more structured list of scenes per chapter, making frontend selection easier.
*   The `generate_scene_narrative` endpoint already accepts `writing_style_notes`, so it supports the regeneration flow.

**Next Steps:**

1.  **Test Thoroughly:**
    *   Start frontend and backend.
    *   Go through the entire flow: Concept -> Outline -> Worldbuilding -> Scene Breakdowns.
    *   Select a chapter to work on from the breakdowns.
    *   Manually copy a scene plan from the displayed breakdown into the "Specific Scene Plan" textarea.
    *   Provide writing style notes.
    *   Generate the narrative.
    *   Edit the narrative in the textarea.
    *   Change writing style notes and regenerate the scene.
    *   Navigate back and forth between steps.
2.  **Address UX for Scene Plan Input:** The manual copy-pasting of the scene plan is a bit clunky. Future improvements:
    *   Frontend parsing of the breakdown Markdown (can be brittle).
    *   Backend changes to return structured scene plans.
    *   A UI that shows individual scene plans from the breakdown as clickable items.

This set of changes implements the core functionalities for Phases 3, 4, and the simplified version of Phase 5.