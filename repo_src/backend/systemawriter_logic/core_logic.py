from .llm_interface import ask_llm
from . import prompts
import re  # For parsing chapter titles from outline

# Helper to simulate context processing if files were uploaded/referenced
def _summarize_context_files(context_files_content: list[str]) -> str:
    if not context_files_content:
        return ""
    # Simple concatenation for now; could be a summary by another LLM call in a more advanced version
    full_context_text = "\n---\n".join(context_files_content)
    # Return a snippet or summary
    return (full_context_text[:1000] + "...") if len(full_context_text) > 1000 else full_context_text

async def generate_outline_logic(concept_document: str, context_files_content: list[str] = None) -> str:
    context_summary = _summarize_context_files(context_files_content or [])
    prompt_text = prompts.get_outline_prompt(concept_document, context_summary)
    outline_md = await ask_llm(prompt_text, system_message="You are an expert story outliner and structure planner.")
    return outline_md

async def generate_worldbuilding_logic(concept_document: str, approved_outline: str, context_files_content: list[str] = None) -> str:
    context_summary = _summarize_context_files(context_files_content or [])
    prompt_text = prompts.get_worldbuilding_prompt(concept_document, approved_outline, context_summary)
    worldbuilding_md = await ask_llm(prompt_text, system_message="You are a creative worldbuilding assistant.")
    return worldbuilding_md

def _extract_chapters_from_outline(outline_md: str) -> list[dict]:
    chapters = []
    # Regex to find H2 headings (## Chapter Title) and capture their content
    # This pattern assumes chapters are H2 and content follows until the next H2 or end of string
    pattern = r"^##\s*(.*?)\s*\n(.*?)(?=\n##\s*|\Z)"
    matches = re.finditer(pattern, outline_md, re.MULTILINE | re.DOTALL)
    for match in matches:
        title = match.group(1).strip()
        summary = match.group(2).strip()
        chapters.append({"title": title, "summary": summary})
    
    # If no H2 chapters found, assume it's a short story plot beat outline
    # and treat the whole outline as a single "chapter" for breakdown purposes.
    if not chapters and outline_md.strip():
         chapters.append({"title": "Main Story Beats", "summary": outline_md.strip()})
    return chapters

async def generate_all_scene_breakdowns_logic(
    approved_outline: str,
    approved_worldbuilding: str,
    context_files_content: list[str] = None  # context_summary not directly used in breakdown prompt but good to have
) -> dict[str, str]:
    chapters = _extract_chapters_from_outline(approved_outline)
    all_breakdowns = {}

    if not chapters:
        # Fallback if outline parsing fails or is empty
        all_breakdowns["Error"] = "Could not parse chapters from the outline. Please ensure the outline uses '## Chapter Title' format."
        return all_breakdowns

    for chapter in chapters:
        prompt_text = prompts.get_scene_breakdowns_prompt(
            chapter_title=chapter["title"],
            chapter_summary_from_outline=chapter["summary"],
            approved_worldbuilding=approved_worldbuilding,
            full_approved_outline=approved_outline
        )
        breakdown_md = await ask_llm(prompt_text, system_message="You are an expert scene planner and story structure analyst.")
        all_breakdowns[chapter["title"]] = breakdown_md
    
    return all_breakdowns

async def generate_scene_narrative_logic(
    scene_plan_from_breakdown: str,  # This is the specific plan for ONE scene
    chapter_title: str,
    full_chapter_scene_breakdown: str,  # Full breakdown for the current chapter
    approved_worldbuilding: str,
    full_approved_outline: str,
    # context_files_content: list[str] = None,  # Not directly used here, but could add writing style from context
    writing_style_notes: str = ""  # User can provide style notes
) -> str:
    prompt_text = prompts.get_scene_narrative_prompt(
        scene_plan_from_breakdown=scene_plan_from_breakdown,
        chapter_title=chapter_title,
        full_chapter_scene_breakdown=full_chapter_scene_breakdown,
        approved_worldbuilding=approved_worldbuilding,
        full_approved_outline=full_approved_outline,
        writing_style_notes=writing_style_notes or "Write in a clear, engaging narrative style. Show, don't just tell. Use vivid descriptions. Maintain consistent character voices."
    )
    narrative_md = await ask_llm(prompt_text, system_message="You are a master storyteller and creative writer.")
    return narrative_md 