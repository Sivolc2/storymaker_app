import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';

interface FullStoryReviewTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const FullStoryReviewTab: React.FC<FullStoryReviewTabProps> = ({ setError }) => {
    const { project } = useProject();

    const assembleFullStoryMarkdown = (): string => {
        if (!project) return '';
        
        let fullMd = "";
        
        // Include outline and worldbuilding
        if (project.outline.content.trim()) {
            fullMd += `# Story Outline\n\n${project.outline.content}\n\n---\n\n`;
        }
        if (project.worldbuilding.content.trim()) {
            fullMd += `# Worldbuilding Notes\n\n${project.worldbuilding.content}\n\n---\n\n`;
        }

        // Add narrative section with sorted scenes
        fullMd += `# Full Story Narrative\n\n`;
        
        const sortedStory = [...project.sceneNarratives].sort((a, b) => {
            if (a.chapterTitle < b.chapterTitle) return -1;
            if (a.chapterTitle > b.chapterTitle) return 1;
            return a.sceneOrderHeuristic - b.sceneOrderHeuristic;
        });
        
        // Group by chapter and concatenate scenes
        let currentChapterForHeader = "";
        sortedStory.forEach(scene => {
            if (scene.chapterTitle !== currentChapterForHeader) {
                fullMd += `## ${scene.chapterTitle}\n\n`;
                currentChapterForHeader = scene.chapterTitle;
            }
            fullMd += `${scene.content}\n\n---\n\n`;
        });

        return fullMd;
    };

    const handleExportStory = () => {
        if (!project) {
            setError("No project to export.");
            return;
        }
        
        const markdownContent = assembleFullStoryMarkdown();
        if (!markdownContent.trim()) {
            setError("No content to export. Please create some scenes first.");
            return;
        }
        
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${project.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Story.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    if (!project) return <p>Please create or load a project first.</p>;

    const assembledStory = assembleFullStoryMarkdown();
    const hasContent = assembledStory.trim().length > 0;
    const sceneCount = project.sceneNarratives.length;

    return (
        <div className="step-card">
            <h2>6. Final Review & Export</h2>
            <p>Review your complete assembled story and export it as a Markdown file.</p>
            
            <div style={{ marginBottom: '20px' }}>
                <h3>Project Summary:</h3>
                <ul>
                    <li>Project Name: <strong>{project.projectName}</strong></li>
                    <li>Concept: {project.concept.isApproved ? '✓ Approved' : '❌ Not approved'}</li>
                    <li>Outline: {project.outline.isApproved ? '✓ Approved' : '❌ Not approved'}</li>
                    <li>Worldbuilding: {project.worldbuilding.isApproved ? '✓ Approved' : '❌ Not approved'}</li>
                    <li>Scene Breakdowns: {project.sceneBreakdowns.isApproved ? '✓ Approved' : '❌ Not approved'}</li>
                    <li>Scenes Written: <strong>{sceneCount}</strong></li>
                    <li>Uploaded Documents: <strong>{project.uploadedDocuments.length}</strong></li>
                </ul>
            </div>

            <div className="action-buttons" style={{ marginBottom: '20px' }}>
                <button 
                    onClick={handleExportStory} 
                    disabled={!hasContent}
                    style={{ 
                        backgroundColor: 'var(--success-color, #4CAF50)',
                        color: 'white',
                        padding: '12px 24px',
                        fontSize: '1.1em',
                        fontWeight: 'bold'
                    }}
                >
                    📥 Export Complete Story
                </button>
            </div>

            {hasContent ? (
                <div>
                    <h3>Assembled Story Preview:</h3>
                    <div style={{ 
                        border: '1px solid #444', 
                        padding: '20px', 
                        borderRadius: '5px',
                        backgroundColor: 'var(--input-bg-color, #2a2a2a)',
                        maxHeight: '600px',
                        overflowY: 'auto'
                    }}>
                        <ReactMarkdown>{assembledStory}</ReactMarkdown>
                    </div>
                    <p style={{ marginTop: '10px', color: 'var(--text-color-muted, #aaa)' }}>
                        Total content: {assembledStory.length} characters
                    </p>
                </div>
            ) : (
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: 'var(--warning-bg, #4a4a1a)', 
                    borderRadius: '5px',
                    textAlign: 'center'
                }}>
                    <h3>No Content to Preview</h3>
                    <p>Your story will appear here once you have:</p>
                    <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                        <li>Approved your outline and worldbuilding</li>
                        <li>Generated and saved at least one scene narrative</li>
                    </ul>
                    <p>Go back to the Scene Writing tab to create your first scene!</p>
                </div>
            )}
        </div>
    );
};

export default FullStoryReviewTab; 