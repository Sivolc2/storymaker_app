import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import ProjectSetupTab from '../components/systemawriter/ProjectSetupTab';
import ConceptTab from '../components/systemawriter/ConceptTab';
import OutlineTab from '../components/systemawriter/OutlineTab';
import WorldbuildingTab from '../components/systemawriter/WorldbuildingTab';
import SceneBreakdownTab from '../components/systemawriter/SceneBreakdownTab';
import SceneWritingTab from '../components/systemawriter/SceneWritingTab';
import FullStoryReviewTab from '../components/systemawriter/FullStoryReviewTab';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/Storymaker.css';
import '../styles/StorymakeTabs.css';

type SystemaWriterTab = 
    | 'project_setup' 
    | 'concept' 
    | 'outline' 
    | 'worldbuilding' 
    | 'scene_breakdowns' 
    | 'scene_writing'
    | 'full_story_review';

interface SystemaWriterPageProps {
    apiUrl: string;
}

const SystemaWriterPage: React.FC<SystemaWriterPageProps> = ({ apiUrl }) => {
    const { project } = useProject();
    const [activeTab, setActiveTab] = useState<SystemaWriterTab>('project_setup');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTabChange = (tab: SystemaWriterTab) => {
        // Logic to check if tab can be accessed (e.g., previous step approved)
        if (!project) {
            setActiveTab('project_setup'); // Always allow project setup
            return;
        }
        let canProceed = true;
        let errorMessage = '';
        switch (tab) {
            case 'concept':
                canProceed = !!project.projectName;
                if (!canProceed) errorMessage = 'Please create a project first.';
                break;
            case 'outline':
                canProceed = project.concept.isApproved;
                if (!canProceed) errorMessage = 'Please approve your concept first.';
                break;
            case 'worldbuilding':
                canProceed = project.outline.isApproved;
                if (!canProceed) errorMessage = 'Please approve your outline first.';
                break;
            case 'scene_breakdowns':
                canProceed = project.worldbuilding.isApproved;
                if (!canProceed) errorMessage = 'Please approve your worldbuilding first.';
                break;
            case 'scene_writing':
                canProceed = project.sceneBreakdowns.isApproved;
                if (!canProceed) errorMessage = 'Please approve your scene breakdowns first.';
                break;
            case 'full_story_review':
                // Allow if at least one scene narrative exists or scene breakdowns are approved
                canProceed = project.sceneBreakdowns.isApproved || project.sceneNarratives.length > 0;
                if (!canProceed) errorMessage = 'Please approve scene breakdowns or save at least one scene first.';
                break;
            default: // project_setup
                break; 
        }

        if (canProceed) {
            setActiveTab(tab);
            setError(null); // Clear any previous errors
        } else {
            setError(errorMessage);
        }
    };

    return (
        <div className="storymaker-container page-container">
            <h1>Storymaker</h1>
            {isLoading && <LoadingSpinner />}
            {error && <p className="error-message">Error: {error}</p>}

            {project && <p>Working on Project: <strong>{project.projectName}</strong></p>}

            <div className="sw-tabs-nav">
                <button 
                    onClick={() => handleTabChange('project_setup')} 
                    className={activeTab === 'project_setup' ? 'active' : ''}
                >
                    Project Setup
                </button>
                <button 
                    onClick={() => handleTabChange('concept')} 
                    className={activeTab === 'concept' ? 'active' : ''} 
                    disabled={!project}
                >
                    1. Concept
                </button>
                <button 
                    onClick={() => handleTabChange('outline')} 
                    className={activeTab === 'outline' ? 'active' : ''} 
                    disabled={!project || !project.concept.isApproved}
                >
                    2. Outline
                </button>
                <button 
                    onClick={() => handleTabChange('worldbuilding')} 
                    className={activeTab === 'worldbuilding' ? 'active' : ''} 
                    disabled={!project || !project.outline.isApproved}
                >
                    3. Worldbuilding
                </button>
                <button 
                    onClick={() => handleTabChange('scene_breakdowns')} 
                    className={activeTab === 'scene_breakdowns' ? 'active' : ''} 
                    disabled={!project || !project.worldbuilding.isApproved}
                >
                    4. Scene Breakdowns
                </button>
                <button 
                    onClick={() => handleTabChange('scene_writing')} 
                    className={activeTab === 'scene_writing' ? 'active' : ''} 
                    disabled={!project || !project.sceneBreakdowns.isApproved}
                >
                    5. Scene Writing
                </button>
                <button 
                    onClick={() => handleTabChange('full_story_review')} 
                    className={activeTab === 'full_story_review' ? 'active' : ''} 
                    disabled={!project || (!project.sceneBreakdowns.isApproved && project.sceneNarratives.length === 0)}
                >
                    6. Review & Export
                </button>
            </div>

            <div className="sw-tab-content">
                {activeTab === 'project_setup' && (
                    <ProjectSetupTab 
                        apiUrl={apiUrl} 
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                        onProjectCreated={() => handleTabChange('concept')} 
                    />
                )}
                {project && activeTab === 'concept' && (
                    <ConceptTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                        onConceptApproved={() => handleTabChange('outline')} 
                    />
                )}
                {project && activeTab === 'outline' && (
                    <OutlineTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                        onOutlineApproved={() => handleTabChange('worldbuilding')} 
                    />
                )}
                {project && activeTab === 'worldbuilding' && (
                    <WorldbuildingTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                        onWorldbuildingApproved={() => handleTabChange('scene_breakdowns')} 
                    />
                )}
                {project && activeTab === 'scene_breakdowns' && (
                    <SceneBreakdownTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                        onBreakdownsApproved={() => handleTabChange('scene_writing')} 
                    />
                )}
                {project && activeTab === 'scene_writing' && (
                    <SceneWritingTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                    />
                )}
                {project && activeTab === 'full_story_review' && (
                    <FullStoryReviewTab 
                        apiUrl={apiUrl} 
                        isLoading={isLoading}
                        setIsLoading={setIsLoading} 
                        setError={setError} 
                    />
                )}
            </div>
        </div>
    );
};

export default SystemaWriterPage; 