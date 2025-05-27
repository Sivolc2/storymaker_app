import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';

interface ConceptTabProps {
    apiUrl: string;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onConceptApproved: () => void;
}

const ConceptTab: React.FC<ConceptTabProps> = ({ isLoading, setError, onConceptApproved }) => {
    const { project, updateArtifact } = useProject();
    const [conceptText, setConceptText] = useState(project?.concept.content || '');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        // Sync local state if project context changes (e.g., loading a project)
        if (project) {
            setConceptText(project.concept.content);
        }
    }, [project?.concept.content]);

    useEffect(() => {
        // Clear success message after 3 seconds
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleSaveConcept = () => {
        if (!project) return;
        setError(null);
        updateArtifact('concept', conceptText, project.concept.isApproved); // Preserve approval status on save
        setSuccessMessage("Concept saved successfully!");
    };

    const handleApproveConcept = () => {
        if (!project || !conceptText.trim()) {
            setError("Concept cannot be empty to approve.");
            return;
        }
        updateArtifact('concept', conceptText, true); // Save and mark as approved
        setSuccessMessage("Concept approved! You can now proceed to Outline generation.");
        onConceptApproved(); // Notify parent, but user navigates manually
    };
    
    const handleReviseApproval = () => {
        if (!project) return;
        updateArtifact('concept', conceptText, false);
    };
    
    if (!project) return <p>Please create or load a project first.</p>;

    return (
        <div className="step-card">
            <h2>Story Concept</h2>
            <p>Provide your core story idea, genre, key characters, plot points, etc. The more detail, the better!</p>
            <a href="/docs/storymaker_usage.md" target="_blank" rel="noopener noreferrer">View Concept Document Checklist</a>
            <textarea
                value={conceptText}
                onChange={(e) => setConceptText(e.target.value)}
                placeholder="Enter your story concept here..."
                rows={15}
                disabled={project.concept.isApproved} // Disable if approved
            />
            <div className="action-buttons">
                <button onClick={handleSaveConcept} disabled={isLoading || project.concept.isApproved}>
                    Save Concept
                </button>
                {!project.concept.isApproved && (
                    <button onClick={handleApproveConcept} disabled={isLoading || !conceptText.trim()}>
                        Save & Approve Concept
                    </button>
                )}
                {project.concept.isApproved && (
                    <p className="approved-text">
                        ✓ Concept Approved. 
                        <button onClick={handleReviseApproval}>Revise Approval</button>
                    </p>
                )}
            </div>
            {successMessage && <p className="success-message">{successMessage}</p>}
        </div>
    );
};

export default ConceptTab; 