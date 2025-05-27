import React, { useState, useRef } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { v4 as uuidv4 } from 'uuid';

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
            onProjectCreated(); // To switch tab
        } else {
            updateProjectName(newProjectName.trim());
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