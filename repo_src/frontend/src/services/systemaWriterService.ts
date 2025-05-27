interface ConceptInput {
    concept_document: string;
}
interface OutlineResponse {
    outline_md: string;
}

interface GenerateWorldbuildingInput {
    concept_document: string;
    approved_outline_md: string;
}
interface WorldbuildingResponse {
    worldbuilding_md: string;
}

interface GenerateSceneBreakdownsInput {
    approved_outline_md: string;
    approved_worldbuilding_md: string;
}
interface SceneBreakdownsResponse {
    scene_breakdowns_by_chapter: { [key: string]: string };
}

interface GenerateSceneNarrativeInput {
    scene_plan_from_breakdown: string;
    chapter_title: string;
    full_chapter_scene_breakdown: string;
    approved_worldbuilding_md: string;
    full_approved_outline_md: string;
    writing_style_notes?: string;
}
interface SceneNarrativeResponse {
    scene_narrative_md: string;
}


const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const API_BASE_PATH = '/api/systemawriter'; // Assuming FastAPI router is prefixed

export const generateOutline = async (apiUrl: string, payload: ConceptInput): Promise<OutlineResponse> => {
    const response = await fetch(`${apiUrl}${API_BASE_PATH}/generate-outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const generateWorldbuilding = async (apiUrl: string, payload: GenerateWorldbuildingInput): Promise<WorldbuildingResponse> => {
    const response = await fetch(`${apiUrl}${API_BASE_PATH}/generate-worldbuilding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const generateSceneBreakdowns = async (apiUrl: string, payload: GenerateSceneBreakdownsInput): Promise<SceneBreakdownsResponse> => {
    const response = await fetch(`${apiUrl}${API_BASE_PATH}/generate-scene-breakdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const generateSceneNarrative = async (apiUrl: string, payload: GenerateSceneNarrativeInput): Promise<SceneNarrativeResponse> => {
    const response = await fetch(`${apiUrl}${API_BASE_PATH}/generate-scene-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}; 