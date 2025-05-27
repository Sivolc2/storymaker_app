import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { 
    generateOutline, 
    generateWorldbuilding, 
    generateSceneBreakdowns, 
    generateSceneNarrative 
} from '../services/systemaWriterService'
import LoadingSpinner from '../components/LoadingSpinner'
import '../styles/SystemaWriter.css'

type CurrentStep = 
    | 'concept' 
    | 'outline' 
    | 'worldbuilding' 
    | 'scene_breakdowns_display'  // Displaying all breakdowns
    | 'scene_narrative_setup'     // Setting up for a specific scene generation
    | 'scene_narrative_review'    // Reviewing/editing/regenerating a specific scene

interface SceneBreakdownData {
    [chapterTitle: string]: string // Markdown for each chapter's breakdown
}

interface ActiveSceneDetails { // Renamed from SceneToGenerate for clarity
    chapterTitle: string
    fullChapterBreakdownMd: string // Full breakdown for its chapter
    scenePlanInput: string // User input/copy-pasted plan for the specific scene
}

interface SystemaWriterPageProps {
    apiUrl: string
}

function SystemaWriterPage({ apiUrl }: SystemaWriterPageProps) {
    const [currentStep, setCurrentStep] = useState<CurrentStep>('concept')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [conceptDoc, setConceptDoc] = useState('')
    
    const [generatedOutline, setGeneratedOutline] = useState('')
    const [approvedOutline, setApprovedOutline] = useState('')
    
    const [generatedWorldbuilding, setGeneratedWorldbuilding] = useState('')
    const [approvedWorldbuilding, setApprovedWorldbuilding] = useState('')

    const [generatedSceneBreakdowns, setGeneratedSceneBreakdowns] = useState<SceneBreakdownData | null>(null)
    
    const [activeSceneDetails, setActiveSceneDetails] = useState<ActiveSceneDetails | null>(null)
    const [generatedSceneNarrative, setGeneratedSceneNarrative] = useState('')
    const [editedSceneNarrative, setEditedSceneNarrative] = useState('') // For user edits
    
    const [writingStyleNotes, setWritingStyleNotes] = useState('')

    const handleGenerateOutline = async () => {
        if (!conceptDoc.trim()) {
            setError("Please provide a story concept.")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const data = await generateOutline(apiUrl, { concept_document: conceptDoc })
            setGeneratedOutline(data.outline_md)
            setApprovedOutline(data.outline_md) // Pre-fill for editing
            setCurrentStep('outline')
        } catch (err: any) {
            setError(err.message || "Failed to generate outline.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateWorldbuilding = async () => {
        if (!approvedOutline.trim()) {
            setError("Approved outline is missing.")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const data = await generateWorldbuilding(apiUrl, { 
                concept_document: conceptDoc,
                approved_outline_md: approvedOutline 
            })
            setGeneratedWorldbuilding(data.worldbuilding_md)
            setApprovedWorldbuilding(data.worldbuilding_md)
            setCurrentStep('worldbuilding')
        } catch (err: any) {
            setError(err.message || "Failed to generate worldbuilding.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateSceneBreakdowns = async () => {
        if (!approvedWorldbuilding.trim()) {
            setError("Approved worldbuilding is missing.")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const data = await generateSceneBreakdowns(apiUrl, {
                approved_outline_md: approvedOutline,
                approved_worldbuilding_md: approvedWorldbuilding
            })
            setGeneratedSceneBreakdowns(data.scene_breakdowns_by_chapter)
            setCurrentStep('scene_breakdowns_display')
        } catch (err: any) {
            setError(err.message || "Failed to generate scene breakdowns.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSetupSceneNarrative = (chapterTitle: string, fullChapterBreakdownMd: string) => {
        setActiveSceneDetails({
            chapterTitle,
            fullChapterBreakdownMd,
            scenePlanInput: "" // User will fill this
        })
        setGeneratedSceneNarrative('') // Clear previous narrative
        setEditedSceneNarrative('')
        setCurrentStep('scene_narrative_setup')
    }

    const handleGenerateSceneNarrative = async () => {
        if (!activeSceneDetails || !activeSceneDetails.scenePlanInput.trim()) {
            setError("Scene plan to generate is missing or empty.")
            return
        }
        if (!approvedOutline.trim() || !approvedWorldbuilding.trim()) {
            setError("Approved outline or worldbuilding is missing.")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            const data = await generateSceneNarrative(apiUrl, {
                scene_plan_from_breakdown: activeSceneDetails.scenePlanInput,
                chapter_title: activeSceneDetails.chapterTitle,
                full_chapter_scene_breakdown: activeSceneDetails.fullChapterBreakdownMd,
                approved_worldbuilding_md: approvedWorldbuilding,
                full_approved_outline_md: approvedOutline,
                writing_style_notes: writingStyleNotes || undefined
            })
            setGeneratedSceneNarrative(data.scene_narrative_md)
            setEditedSceneNarrative(data.scene_narrative_md) // Initialize editor with new generation
            setCurrentStep('scene_narrative_review')
        } catch (err: any) {
            setError(err.message || "Failed to generate scene narrative.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="systemawriter-container page-container">
            <h1>SystemaWriter - AI Story Generation</h1>
            {error && <p className="error-message">Error: {error}</p>}
            {isLoading && <LoadingSpinner />}

            {currentStep === 'concept' && (
                <div className="step-card">
                    <h2>Step 1: Story Concept</h2>
                    <p>Provide your core story idea, genre, key characters, plot points, etc. The more detail, the better!</p>
                    <textarea
                        value={conceptDoc}
                        onChange={(e) => setConceptDoc(e.target.value)}
                        placeholder="Enter your story concept here..."
                        rows={15}
                        disabled={isLoading}
                    />
                    <button onClick={handleGenerateOutline} disabled={isLoading || !conceptDoc.trim()}>
                        Generate Outline
                    </button>
                </div>
            )}

            {currentStep === 'outline' && (
                <div className="step-card">
                    <h2>Step 2: Review & Approve Outline</h2>
                    <p>Review the generated outline. You can edit it below before proceeding.</p>
                    <textarea
                        value={approvedOutline}
                        onChange={(e) => setApprovedOutline(e.target.value)}
                        rows={20}
                        disabled={isLoading}
                    />
                    <div className="generated-content-preview">
                        <h3>Original Generated Outline:</h3>
                        <ReactMarkdown>{generatedOutline}</ReactMarkdown>
                    </div>
                    <button onClick={() => setCurrentStep('concept')}>&laquo; Back to Concept</button>
                    <button onClick={handleGenerateWorldbuilding} disabled={isLoading || !approvedOutline.trim()}>
                        Approve Outline & Generate Worldbuilding &raquo;
                    </button>
                </div>
            )}

            {currentStep === 'worldbuilding' && (
                 <div className="step-card">
                    <h2>Step 3: Review & Approve Worldbuilding</h2>
                    <p>Review the generated worldbuilding details. Edit as needed.</p>
                    <textarea
                        value={approvedWorldbuilding}
                        onChange={(e) => setApprovedWorldbuilding(e.target.value)}
                        rows={20}
                        disabled={isLoading}
                    />
                     <div className="generated-content-preview">
                        <h3>Original Generated Worldbuilding:</h3>
                        <ReactMarkdown>{generatedWorldbuilding}</ReactMarkdown>
                    </div>
                    <button onClick={() => setCurrentStep('outline')}>&laquo; Back to Outline</button>
                    <button onClick={handleGenerateSceneBreakdowns} disabled={isLoading || !approvedWorldbuilding.trim()}>
                        Approve Worldbuilding & Generate Scene Breakdowns &raquo;
                    </button>
                </div>
            )}

            {currentStep === 'scene_breakdowns_display' && generatedSceneBreakdowns && (
                <div className="step-card">
                    <h2>Step 4: Review Scene Breakdowns</h2>
                    <p>Below are AI-generated scene breakdowns for each chapter. Review them. To write a scene, select a chapter and you'll be prompted to provide the specific scene plan from the breakdown.</p>
                    {Object.entries(generatedSceneBreakdowns).map(([chapterTitle, breakdownMd]) => (
                        <div key={chapterTitle} className="chapter-breakdown">
                            <h3>{chapterTitle}</h3>
                            <ReactMarkdown>{breakdownMd}</ReactMarkdown>
                            <button 
                                onClick={() => handleSetupSceneNarrative(chapterTitle, breakdownMd)}
                                disabled={isLoading}
                                >
                                Work on a scene in "{chapterTitle}" &raquo;
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setCurrentStep('worldbuilding')}>&laquo; Back to Worldbuilding</button>
                </div>
            )}

            {currentStep === 'scene_narrative_setup' && activeSceneDetails && (
                <div className="step-card">
                    <h2>Step 5a: Setup Scene Narrative Generation</h2>
                    <p>For chapter: <strong>{activeSceneDetails.chapterTitle}</strong></p>
                    <p>Please copy the specific plan for ONE scene from the chapter breakdown (displayed in the previous step or viewable if you go back) and paste it into the textarea below.</p>
                    <div>
                        <label htmlFor="scenePlanInput">Specific Scene Plan (from breakdown):</label>
                        <textarea
                            id="scenePlanInput"
                            value={activeSceneDetails.scenePlanInput}
                            onChange={(e) => setActiveSceneDetails(prev => prev ? {...prev, scenePlanInput: e.target.value} : null)}
                            rows={8}
                            placeholder="Paste or type the specific plan for the scene to be written here..."
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="writingStyleNotes">Optional Writing Style Notes:</label>
                        <input 
                            type="text"
                            id="writingStyleNotes"
                            value={writingStyleNotes}
                            onChange={(e) => setWritingStyleNotes(e.target.value)}
                            placeholder="e.g., Tense, past-tense, focus on character's internal thoughts"
                            disabled={isLoading}
                        />
                    </div>
                    <button onClick={() => setCurrentStep('scene_breakdowns_display')}>&laquo; Back to Scene Breakdowns</button>
                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !activeSceneDetails.scenePlanInput.trim()}>
                        Generate Scene Narrative
                    </button>
                </div>
            )}

            {currentStep === 'scene_narrative_review' && activeSceneDetails && (
                <div className="step-card">
                    <h2>Step 5b: Review, Edit & Regenerate Scene Narrative</h2>
                    <p>Scene in chapter: <strong>{activeSceneDetails.chapterTitle}</strong></p>
                    <div>
                        <h4>Original Scene Plan Used:</h4>
                        <ReactMarkdown>{activeSceneDetails.scenePlanInput}</ReactMarkdown>
                    </div>
                     <div>
                        <label htmlFor="editedSceneNarrative">Edit Generated Narrative:</label>
                        <textarea
                            id="editedSceneNarrative"
                            value={editedSceneNarrative}
                            onChange={(e) => setEditedSceneNarrative(e.target.value)}
                            rows={20}
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="writingStyleNotesRegen">Writing Style Notes (for regeneration):</label>
                        <input 
                            type="text"
                            id="writingStyleNotesRegen"
                            value={writingStyleNotes} // Reuses the same state for simplicity
                            onChange={(e) => setWritingStyleNotes(e.target.value)}
                            placeholder="e.g., More suspense, focus on inner thoughts"
                            disabled={isLoading}
                        />
                    </div>
                    <button onClick={() => { setCurrentStep('scene_breakdowns_display'); setActiveSceneDetails(null); setGeneratedSceneNarrative(''); setEditedSceneNarrative(''); }}>
                        &laquo; Back to Scene Breakdowns
                    </button>
                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !activeSceneDetails.scenePlanInput.trim()}>
                        Regenerate Scene
                    </button>
                    
                    {generatedSceneNarrative && (
                        <div className="generated-content-preview" style={{marginTop: '20px'}}>
                            <h3>Generated Scene Narrative:</h3>
                            <ReactMarkdown>{generatedSceneNarrative}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}

export default SystemaWriterPage 