# Prompts for SystemaWriter

CONCEPT_DOCUMENT_GUIDE = """
When crafting your concept, consider including:
1. High-Level Premise: The core idea of the story.
2. Genre: e.g., Sci-Fi, Fantasy, Cultivation Novel.
3. Key Tropes/Elements (Optional): To include or avoid.
4. Core Themes (Optional): Underlying messages.
5. Main Character(s) Idea: Brief description or archetype.
6. Setting Snippet (Optional): A few words about the world.
7. Target Audience/Tone (Optional): e.g., YA, grimdark.
8. Desired Length Indication (Optional): Short story, chapter.
9. Key Plot Beats (Optional but Recommended): Major events.
"""

def get_outline_prompt(concept_document: str, context_summary: str = "") -> str:
    prompt = f"""
You are a master story outliner. Based on the following story concept, generate a detailed chapter-by-chapter outline or a plot beat outline for a short story.
The outline should be in Markdown format, with clear chapter titles or main plot points as H2 headings (##) and brief summaries for each.

**Story Concept:**
{concept_document}
"""
    if context_summary:
        prompt += f"""
**Additional Context/Inspirational Material Summary:**
{context_summary}
"""
    prompt += f"""
Remember to structure the output as a Markdown document.
For a chaptered story, an example structure:
## Chapter 1: The Discovery
- Elara finds the artifact.
- Village elders are suspicious.

## Chapter 2: The Flight
- The empire's soldiers arrive.
- Elara escapes with the help of a mysterious stranger.

If the concept implies a shorter story (e.g., a single scene or very short narrative), provide 3-5 major plot beats instead of chapters, like:
## Beat 1: The Setup
- Brief description of the situation.

Focus on a logical flow and ensure key elements from the concept are addressed. Ensure the output is well-formatted Markdown.
The user's concept document guidelines were:
{CONCEPT_DOCUMENT_GUIDE}

Generate the outline now:
"""
    return prompt

def get_worldbuilding_prompt(concept_document: str, approved_outline: str, context_summary: str = "") -> str:
    prompt = f"""
You are a worldbuilding assistant. Based on the provided story concept and the approved story outline, expand on the worldbuilding details.
Generate a Markdown document with the following sections:
## Main Characters
- For each main character hinted at in the concept or outline:
  - Name (suggest if not provided)
  - Brief Description (appearance, core personality traits)
  - Motivations
  - Potential Arc (how they might change or what they might achieve based on the outline)

## Setting Details
- Key Locations mentioned or implied by the outline.
- Time Period/Technology Level (e.g., medieval, futuristic).
- Culture Snippets (e.g., societal norms, beliefs if hinted).
- Magic System/Unique World Rules (if applicable, explain briefly how it works or its impact).

## Other Key Elements (If Applicable)
- Important Factions/Organizations.
- Important items or artifacts.

**Story Concept:**
{concept_document}

**Approved Story Outline:**
{approved_outline}
"""
    if context_summary:
        prompt += f"""
**Additional Context/Inspirational Material Summary:**
{context_summary}
"""
    prompt += """
Generate the worldbuilding document now in Markdown format:
"""
    return prompt

def get_scene_breakdowns_prompt(chapter_title: str, chapter_summary_from_outline: str, approved_worldbuilding: str, full_approved_outline: str) -> str:
    prompt = f"""
You are a scene planner. For the given chapter, break it down into a sequence of distinct scenes.
The chapter is: **{chapter_title}**
Its summary from the overall outline is: "{chapter_summary_from_outline}"

For each scene, provide the following in Markdown list format:
- **Scene Number:** (e.g., Scene 1.1, Scene 1.2)
- **Goal:** What this scene needs to achieve for the plot or character development.
- **Characters Present:** List main characters involved.
- **Key Events/Actions:** What happens in this scene? Be specific.
- **Setting:** Where does this scene take place?
- **Information Revealed (if any):** What new information does the audience or a character learn?
- **Emotional Shift/Tone (Optional):** e.g., suspenseful, hopeful, tense.

Reference the approved worldbuilding document and the full story outline for context.

**Full Approved Story Outline:**
{full_approved_outline}

**Approved Worldbuilding Document:**
{approved_worldbuilding}

Generate the scene breakdown for Chapter "{chapter_title}" now:
"""
    return prompt

def get_scene_narrative_prompt(
    scene_plan_from_breakdown: str,
    chapter_title: str,
    full_chapter_scene_breakdown: str,
    approved_worldbuilding: str,
    full_approved_outline: str,
    writing_style_notes: str = "Write in a clear, engaging narrative style. Show, don't just tell. Use vivid descriptions for settings and actions. Maintain consistent character voices based on the worldbuilding."
) -> str:
    prompt = f"""
You are a creative writer. Write the full narrative for the following scene.
Adhere to the details provided in the scene plan, worldbuilding, and overall story outline.

**Overall Story Outline:**
{full_approved_outline}

**Worldbuilding Details:**
{approved_worldbuilding}

**Current Chapter:** {chapter_title}

**Full Scene Breakdown for this Chapter:**
{full_chapter_scene_breakdown}

**Specific Scene to Write (Plan from Breakdown):**
{scene_plan_from_breakdown}

**Writing Style & Instructions:**
{writing_style_notes}
If the scene involves dialogue, make it natural and reflective of the characters' personalities and motivations described in the worldbuilding.
Ensure actions and descriptions are consistent with the established setting and rules.
The output should be the narrative prose for this scene only. Do not add any meta-commentary outside the story itself.

Write the scene now:
"""
    return prompt 