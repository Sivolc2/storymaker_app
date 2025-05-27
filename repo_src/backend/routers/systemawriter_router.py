from fastapi import APIRouter, HTTPException, Body # Removed UploadFile for simplicity in v0.1
from typing import List

from repo_src.backend.systemawriter_logic import core_logic
from repo_src.backend.data import systemawriter_schemas as schemas

router = APIRouter()

@router.post("/generate-outline", response_model=schemas.OutlineResponseSchema)
async def generate_outline(payload: schemas.ConceptInputSchema):
    # For v0.1, context_files_content is not handled via direct upload in this simplified API.
    # If context were to be included, it would need to be passed in the payload.concept_document
    # or handled via a separate mechanism (e.g., pre-loaded server-side files).
    try:
        outline = await core_logic.generate_outline_logic(
            concept_document=payload.concept_document
            # context_files_content=payload.context_files_content or []
        )
        return schemas.OutlineResponseSchema(outline_md=outline)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating outline: {str(e)}")

@router.post("/generate-worldbuilding", response_model=schemas.WorldbuildingResponseSchema)
async def generate_worldbuilding(payload: schemas.GenerateWorldbuildingSchema):
    try:
        worldbuilding = await core_logic.generate_worldbuilding_logic(
            concept_document=payload.concept_document,
            approved_outline=payload.approved_outline_md
            # context_files_content=payload.context_files_content or []
        )
        return schemas.WorldbuildingResponseSchema(worldbuilding_md=worldbuilding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating worldbuilding: {str(e)}")

@router.post("/generate-scene-breakdowns", response_model=schemas.SceneBreakdownsResponseSchema)
async def generate_scene_breakdowns(payload: schemas.GenerateSceneBreakdownsSchema):
    try:
        breakdowns = await core_logic.generate_all_scene_breakdowns_logic(
            approved_outline=payload.approved_outline_md,
            approved_worldbuilding=payload.approved_worldbuilding_md
            # context_files_content=payload.context_files_content or []
        )
        if "Error" in breakdowns: # Check for specific error from logic
             raise HTTPException(status_code=400, detail=breakdowns["Error"])
        return schemas.SceneBreakdownsResponseSchema(scene_breakdowns_by_chapter=breakdowns)
    except HTTPException as e: # Re-raise known HTTP exceptions
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating scene breakdowns: {str(e)}")

@router.post("/generate-scene-narrative", response_model=schemas.SceneNarrativeResponseSchema)
async def generate_scene_narrative(payload: schemas.GenerateSceneNarrativeSchema):
    try:
        narrative = await core_logic.generate_scene_narrative_logic(
            scene_plan_from_breakdown=payload.scene_plan_from_breakdown,
            chapter_title=payload.chapter_title,
            full_chapter_scene_breakdown=payload.full_chapter_scene_breakdown,
            approved_worldbuilding=payload.approved_worldbuilding_md,
            full_approved_outline=payload.full_approved_outline_md,
            writing_style_notes=payload.writing_style_notes
            # context_files_content=payload.context_files_content or []
        )
        return schemas.SceneNarrativeResponseSchema(scene_narrative_md=narrative)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating scene narrative: {str(e)}") 