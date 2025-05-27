from pydantic import BaseModel
from typing import Optional, List, Dict

# --- Request Schemas ---

class ConceptInputSchema(BaseModel):
    concept_document: str
    # context_files_content: Optional[List[str]] = None # For v0.1, keep it simple. Can add later if FE uploads text.

class GenerateWorldbuildingSchema(BaseModel):
    concept_document: str
    approved_outline_md: str
    # context_files_content: Optional[List[str]] = None

class GenerateSceneBreakdownsSchema(BaseModel):
    # concept_document: str # Implicitly part of outline & worldbuilding
    approved_outline_md: str
    approved_worldbuilding_md: str
    # context_files_content: Optional[List[str]] = None

class GenerateSceneNarrativeSchema(BaseModel):
    scene_plan_from_breakdown: str # Markdown for the specific scene's plan
    chapter_title: str
    full_chapter_scene_breakdown: str # Markdown for the entire chapter's scene breakdown
    approved_worldbuilding_md: str
    full_approved_outline_md: str
    writing_style_notes: Optional[str] = None
    # context_files_content: Optional[List[str]] = None


# --- Response Schemas ---

class OutlineResponseSchema(BaseModel):
    outline_md: str

class WorldbuildingResponseSchema(BaseModel):
    worldbuilding_md: str

class SceneBreakdownsResponseSchema(BaseModel):
    scene_breakdowns_by_chapter: Dict[str, str] # Key: Chapter Title, Value: Markdown of scene breakdowns

class SceneNarrativeResponseSchema(BaseModel):
    scene_narrative_md: str

class ErrorResponseSchema(BaseModel):
    detail: str 