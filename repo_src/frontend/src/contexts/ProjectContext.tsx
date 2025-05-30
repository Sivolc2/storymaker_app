import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define types for project artifacts
export interface UploadedDocument {
    id: string;
    name: string;
    content: string; // Text content
    type: string; // e.g., 'text/plain', 'application/pdf'
}

export interface ProjectArtifact {
    content: string; // Markdown or structured data
    isApproved: boolean;
    lastModified: Date;
}

export interface SceneNarrative extends ProjectArtifact {
    sceneIdentifier: string; // e.g., "Chapter 1 - Scene 1.1"
    chapterTitle: string;
    sceneOrderHeuristic: number;
}

export interface ProjectState {
    projectName: string;
    uploadedDocuments: UploadedDocument[];
    concept: ProjectArtifact;
    outline: ProjectArtifact;
    worldbuilding: ProjectArtifact;
    sceneBreakdowns: ProjectArtifact; // Stores the raw MD/JSON of all breakdowns
    sceneNarratives: SceneNarrative[]; // Array of individual scene narratives
    isLoading: boolean; // Global loading state for the project
    // Add more project-specific settings if needed
}

interface ProjectContextType {
    project: ProjectState | null;
    setProject: React.Dispatch<React.SetStateAction<ProjectState | null>>;
    createProject: (name: string) => void;
    updateProjectName: (name: string) => void;
    addUploadedDocument: (doc: UploadedDocument) => void;
    removeUploadedDocument: (docId: string) => void;
    updateUploadedDocumentContent: (docId: string, newContent: string) => void;
    updateArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives' | 'isLoading'>, content: string, isApproved?: boolean) => void;
    updateSceneNarrative: (scene: SceneNarrative) => void;
    getSceneNarrative: (chapterTitle: string, sceneIdentifier: string) => SceneNarrative | undefined;
    setProjectLoading: (isLoading: boolean) => void;
    approveArtifact: (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives' | 'isLoading'>) => void;
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
    isLoading: false,
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
            isLoading: false,
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

    const updateUploadedDocumentContent = (docId: string, newContent: string) => {
        setProject(prev => {
            if (!prev) return null;
            const updatedDocs = prev.uploadedDocuments.map(doc =>
                doc.id === docId ? { ...doc, content: newContent } : doc
            );
            return { ...prev, uploadedDocuments: updatedDocs };
        });
    };

    const updateArtifact = (
        artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives' | 'isLoading'>,
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
    
    const approveArtifact = (artifactName: keyof Omit<ProjectState, 'projectName' | 'uploadedDocuments' | 'sceneNarratives' | 'isLoading'>) => {
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

    const setProjectLoading = (isLoading: boolean) => {
        setProject(prev => prev ? { ...prev, isLoading: isLoading } : null);
    };

    return (
        <ProjectContext.Provider value={{ 
            project, setProject, createProject, updateProjectName, addUploadedDocument, removeUploadedDocument,
            updateUploadedDocumentContent, updateArtifact, approveArtifact, updateSceneNarrative, getSceneNarrative, setProjectLoading
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