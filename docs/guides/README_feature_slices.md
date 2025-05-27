Okay, this is an exciting project! It combines structured information management with generative AI for creative writing. Let's break this down into a detailed project plan, a feature slice document for an initial version, and an overall process document.

**I. Overall Process Document (User & System Flow)**

This document describes the high-level workflow from the user's perspective and how the system facilitates it.

**Project Title:** SystemaWriter - AI-Assisted Narrative Generation

**Vision:** To create an AI-powered system that collaborates with a user to transform initial ideas and contextual information into well-structured, compelling (short) stories, with iterative feedback loops and control over the creative process.

**Guiding Principles:**

1.  **User-in-the-Loop:** The user is the creative director; the AI is a powerful assistant.
2.  **Iterative Refinement:** Storytelling is a process of iteration. The system must support this at multiple levels.
3.  **Structured Creativity:** Provide scaffolding (outlines, worldbuilding) to guide generation and ensure coherence.
4.  **Context is King:** Leverage all provided information to produce relevant and nuanced outputs.
5.  **Modularity:** Design components that can be improved or swapped (e.g., different LLMs, new modules for specific tasks).

**High-Level User & System Workflow:**

1.  **Phase 1: Conception & Input Gathering**
    *   **User Action:**
        *   Provides an initial "Concept Document" (e.g., output of a brainstorming session, a simple text file). This should ideally cover:
            *   High-level story idea/premise.
            *   Desired genre(s) (e.g., sci-fi, fantasy, cultivation).
            *   Key tropes or elements to include/avoid.
            *   Core themes.
            *   Target audience/tone (optional).
            *   Main character archetypes or ideas (brief).
            *   Desired length (e.g., short story, novella chapter).
        *   Provides a "Context Folder" containing:
            *   The Concept Document.
            *   (Optional) List of inspirational stories/books (titles, or even full texts if feasible for context window).
            *   (Optional) Any existing notes, character sketches, world ideas.
    *   **System Action:** Ingests and processes these inputs.

2.  **Phase 2: Story Structuring & Worldbuilding (AI-Assisted)**
    *   **System Action (Iterative with User Approval):**
        *   **2a. Table of Contents / Chapter Outline:** Generates a proposed high-level structure (e.g., key story beats for a short story, chapter titles/summaries for a longer piece).
        *   **User Action:** Reviews, suggests modifications, approves.
        *   **2b. Worldbuilding Document:** Based on the concept and approved outline, generates a preliminary worldbuilding document:
            *   **Characters:** Expands on initial character ideas, suggesting names, core motivations, brief backstories, and potential arcs related to the outline.
            *   **Setting:** Details about the world, key locations, relevant rules/magic systems/technology.
            *   **Lore/Context:** Other relevant information (e.g., factions, historical events).
        *   **User Action:** Reviews, refines (adds/edits/deletes details), approves.

3.  **Phase 3: Scene Decomposition (AI-Assisted)**
    *   **System Action (Iterative with User Approval):**
        *   For each chapter/major story beat from the approved outline:
            *   Generates a list of proposed scenes.
            *   For each scene, defines:
                *   Scene Goal (what this scene needs to achieve for the plot/character).
                *   Characters involved and their immediate objectives.
                *   Key events/actions.
                *   Information to be revealed.
                *   Emotional tone/shift.
                *   Setting/location.
        *   **User Action:** Reviews, modifies scene list and details, approves.

4.  **Phase 4: Scene Generation (AI-Driven, User-Initiated)**
    *   **System Action:**
        *   For each approved scene, using all relevant context (overall outline, worldbuilding docs, specific scene plan):
            *   Generates the narrative text for the scene in a single pass ("Drafter LLM").
    *   **User Action:** Reviews the generated scene.

5.  **Phase 5: Revision & Refinement (AI-Assisted or Manual)**
    *   **System Action (Optional "Editor LLM" / "Reviewer LLM"):**
        *   **5a. Automated Suggestions:** Analyzes the generated scene (and potentially the whole story so far) for:
            *   Consistency with worldbuilding and character arcs.
            *   Pacing and flow.
            *   Clarity and engagement.
            *   Adherence to genre conventions (if specified).
            *   (Future) Suggests changes as "diffs" or specific edits.
        *   **5b. Iterative Regeneration:** User can request regeneration of sections or entire scenes with new prompts or modifications.
    *   **User Action:**
        *   Accepts/rejects AI suggestions.
        *   Manually edits the text.
        *   Requests targeted re-writes.
        *   Approves the final scene/chapter.

6.  **Phase 6: Final Review & Export**
    *   **User Action:** Reads through the entire assembled story.
    *   **System Action (Optional "Consistency Check LLM"):** Performs a final pass over the entire text for global consistency.
    *   **User Action:** Makes final edits.
    *   **System Action:** Exports the full story in a user-friendly format (e.g., Markdown, TXT, DOCX).

**Review Mode:**
At each stage requiring user approval (2a, 2b, 3, 4 (implicitly), 5), the system will pause and wait for explicit user confirmation before proceeding. This is crucial for managing token consumption and ensuring the story aligns with the user's vision.

---

**II. Feature Slice Document: v0.1 - Core Narrative Scaffolding & Scene Generation**

This focuses on implementing the "script" idea from your v1 notes as a foundational MVP.

*   **Feature Name:** Core Narrative Scaffolding & Scene Generation (v0.1)
*   **User Story:**
    *   "As a writer, I want to provide my core story concept and contextual materials, so that the AI can generate a detailed story outline, worldbuilding notes, and scene-by-scene plans for my approval."
    *   "As a writer, once I approve the plans, I want the AI to generate a first-pass draft of each scene based on all the structured information."
*   **Description:**
    This feature slice enables the system to take a user-provided concept document and a folder of contextual materials. It will then:
    1.  Generate a Table of Contents/Chapter Outline.
    2.  Generate a Worldbuilding Document (Characters, Setting).
    3.  Allow user approval for (1) and (2).
    4.  For each chapter, generate a detailed Scene Breakdown.
    5.  Allow user approval for (4).
    6.  Generate a first-pass narrative for each scene using all approved documents.
    All interactions initially will be CLI-based, with documents as files.

*   **Acceptance Criteria:**
    1.  **AC1 (Input):** System can successfully ingest a user-provided "Concept Document" (text file) and a "Context Folder" (containing text files).
    2.  **AC2 (Outline Generation):** System generates a coherent Table of Contents/Chapter Outline (markdown file) based on the Concept Document.
    3.  **AC3 (Worldbuilding Generation):** System generates a Worldbuilding Document (markdown file) with sections for Characters and Setting, consistent with the Concept Document and generated Outline.
    4.  **AC4 (User Approval - Outline & Worldbuilding):** System pauses after generating Outline and Worldbuilding docs, prompting the user (CLI) to review and approve (e.g., "Files generated. Review and type 'yes' to continue, or edit files and type 'yes'").
    5.  **AC5 (Scene Breakdown Generation):** Upon approval, for each chapter in the Outline, system generates a Scene Breakdown document (markdown file) detailing goals, characters, events for each scene.
    6.  **AC6 (User Approval - Scene Breakdowns):** System pauses after generating Scene Breakdowns, prompting user for review and approval.
    7.  **AC7 (Scene Generation):** Upon approval, for each scene in the Scene Breakdown, system generates a first-pass narrative text (markdown file per scene, or appended to a chapter file). Generation must use:
        *   Overall Outline
        *   Worldbuilding Document
        *   Relevant Chapter's Scene Breakdown
        *   Specific Scene's plan
    8.  **AC8 (Output):** All generated documents (Outline, Worldbuilding, Scene Breakdowns, Scene Drafts) are saved in a structured output folder.
    9.  **AC9 (Modularity):** Prompts for each generation step (Outline, Worldbuilding, Scene Breakdown, Scene Draft) are clearly defined and separable, allowing for easy modification.
    10. **AC10 (Review Mode):** The system defaults to "review mode," requiring user confirmation at specified checkpoints (AC4, AC6) before proceeding.

*   **Inputs:**
    *   `concept_document.txt`: User's high-level story concept (genre, tropes, beats, etc.).
    *   `context_folder/`: Directory containing:
        *   `concept_document.txt` (can be a copy or symlink)
        *   (Optional) `inspirational_texts/`: Folder with `.txt` files of similar stories/books.
        *   (Optional) `user_notes.txt`: Any other free-form notes.

*   **Outputs (in an `output/` directory):**
    *   `01_table_of_contents.md`
    *   `02_worldbuilding.md`
    *   `03_chapters/`
        *   `chapter_1_scenes.md` (Scene breakdown for chapter 1)
        *   `chapter_1_draft.md` (Generated narrative for chapter 1 scenes)
        *   `chapter_2_scenes.md`
        *   `chapter_2_draft.md`
        *   ... etc.

*   **Process Flow (for this slice):**
    1.  Script initiated by user, pointing to input document and context folder.
    2.  **Step 1 (LLM Call 1):** Generate Table of Contents using `concept_document.txt` and `context_folder/` content. Save as `01_table_of_contents.md`.
    3.  **Step 2 (LLM Call 2):** Generate Worldbuilding Document using `concept_document.txt`, `01_table_of_contents.md`, and `context_folder/` content. Save as `02_worldbuilding.md`.
    4.  **User Approval Point 1:** Pause. User reviews `01_table_of_contents.md` and `02_worldbuilding.md`. User can edit these files directly. User signals approval.
    5.  **Step 3 (Loop per Chapter - LLM Call 3.x):** For each chapter in (approved) `01_table_of_contents.md`:
        *   Generate Scene Breakdown using `concept_document.txt`, `01_table_of_contents.md`, `02_worldbuilding.md`, and current chapter context. Save as `03_chapters/chapter_X_scenes.md`.
    6.  **User Approval Point 2:** Pause. User reviews all `chapter_X_scenes.md` files. User can edit. User signals approval.
    7.  **Step 4 (Loop per Scene - LLM Call 4.x.y):** For each scene in each (approved) `chapter_X_scenes.md`:
        *   Generate Scene Narrative using all relevant documents (`concept_document.txt`, `01_table_of_contents.md`, `02_worldbuilding.md`, `chapter_X_scenes.md`, specific scene plan). Append to `03_chapters/chapter_X_draft.md`.
    8.  Process completes. User can review all generated draft files.

*   **Assumptions:**
    *   Access to a powerful reasoning LLM (e.g., GPT-4, Claude 3 Opus) via API.
    *   User is comfortable with CLI and editing markdown files for this v0.1.
    *   Context window of the LLM is sufficient to handle combined inputs for each step (this needs careful prompt engineering and potentially chunking/summarization for very large context folders).

*   **Risks/Open Questions:**
    *   **Token Limits:** Concatenating all context for each LLM call might exceed token limits. Mitigation: Summarization of context, more targeted context selection.
    *   **Prompt Engineering Complexity:** Crafting effective prompts for each stage is critical and will require iteration.
    *   **Consistency:** Ensuring consistency across independently generated documents and scenes.
    *   **User Approval Workflow:** CLI approval is basic; how to handle more complex feedback or desire to "go back" a step? (Out of scope for v0.1, but a consideration).
    *   **Cost Management:** Multiple LLM calls can be expensive. "Review mode" helps, but efficient prompting is key.

*   **Out of Scope (for this v0.1 slice):**
    *   GUI / Web interface.
    *   Iterative "editor LLM" pass on generated scenes.
    *   Diff-like change suggestions.
    *   Graph-based story tracking.
    *   Special handling for problematic content (violence, etc.).
    *   Direct integration with storyboarding tools.
    *   Stellaris game state story generation (requires specialized parser).
    *   Chat window for brainstorming.

---

**III. Project Plan (Phased Approach)**

This outlines the development stages.

**Phase 0: Foundation & Core Pipeline (v0.1 - Target: 2-4 Weeks)**

*   **Goal:** Implement the "Core Narrative Scaffolding & Scene Generation" feature slice.
*   **Key Deliverables:**
    *   Working Python script for the v0.1 feature slice.
    *   Set of well-engineered prompts for each generation step.
    *   README.md with usage instructions and input document checklist.
    *   Basic test suite with a sample concept document and context folder.
*   **Tasks:**
    1.  **Setup:** Project structure, virtual environment, API key management, basic LLM interaction library.
    2.  **Input Processing:** Develop functions to read and concatenate text from concept doc and context folder.
    3.  **Prompt Engineering (Iterative for each step):**
        *   Table of Contents generation.
        *   Worldbuilding Document generation.
        *   Scene Breakdown generation.
        *   Scene Narrative generation.
    4.  **Script Logic:** Implement the sequential flow, file I/O, and CLI-based user approval points.
    5.  **Output Formatting:** Ensure outputs are clean markdown.
    6.  **Testing:**
        *   Unit tests for input/output functions.
        *   End-to-end tests with a sample "cultivation novel" concept.
    7.  **Documentation:** Write README.md.
*   **Technology Stack (Initial):**
    *   Python
    *   LLM API (OpenAI, Anthropic, etc.)
    *   Markdown for document formats
*   **Team Considerations (if applicable):**
    *   1-2 developers with Python and prompt engineering skills.

**Phase 1: Enhanced Iteration & Control (v0.2 - Target: Additional 3-5 Weeks)**

*   **Goal:** Improve user control, introduce iterative refinement within scenes, and add an "editor" pass.
*   **Key Deliverables:**
    *   Ability to regenerate specific sections (chapters, scenes) without redoing everything.
    *   "Editor LLM" pass for generated scenes with suggestions (e.g., as comments or a separate "suggestions" file).
    *   (Stretch) Simple diff-like view for changes if an editor LLM modifies text.
    *   More robust error handling and logging.
*   **Tasks:**
    1.  **State Management:** Improve how the system tracks approved vs. draft content to allow targeted regeneration.
    2.  **Editor LLM Prompting:** Develop prompts for an LLM to review a scene and suggest improvements (style, consistency, pacing).
    3.  **Suggestion Integration:** How to present LLM editor suggestions to the user (e.g., inline comments, separate file).
    4.  **Targeted Regeneration Logic:** Allow user to specify "regenerate scene X" or "regenerate chapter Y outline."
    5.  **User Interface (CLI):** Enhance CLI for more granular control.
    6.  **Testing:** Test new iterative features.

**Phase 2: Advanced Features & Early UI Exploration (v0.3 - Target: Additional 4-6 Weeks)**

*   **Goal:** Introduce more sophisticated story modeling and explore a basic GUI.
*   **Key Deliverables:**
    *   Experimental graph-based tracking for key story elements (characters, plot points, items) – could be a visual export or internal model.
    *   Mechanism for "spacing" or varying detail/length between nodes (e.g., some plot points get more scenes).
    *   Basic web UI (e.g., Streamlit, Flask) for input, displaying generated documents, and approvals.
    *   (Stretch) Initial work on Stellaris generator: game state parser and mapping to story concepts.
*   **Tasks:**
    1.  **Graph Model Design:** Define schema for story graph.
    2.  **Graph Population:** Logic to extract entities and relationships from generated text or plans to populate the graph.
    3.  **Graph Visualization/Export:** (e.g., to DOT language for Graphviz).
    4.  **UI Development:**
        *   File uploads for inputs.
        *   Display areas for generated markdown.
        *   Buttons for approval steps.
    5.  **Stellaris Parser (if pursued):** Research game save formats, identify key story-relevant data.
    6.  **Prompting for Stellaris:** Adapting story generation prompts for game-specific data.

**Phase 3: Leveraging New Context Engines & Richer Interaction (v1.0 - Target: Ongoing)**

*   **Goal:** Integrate insights from tools like Cursor (advanced RAG, contextual understanding, code-like editing for prose) and a chat interface.
*   **Key Deliverables:**
    *   "Brainstorming Chat" interface for initial idea development, which feeds into the Concept Document.
    *   More sophisticated RAG: Use vector databases for context documents for more efficient and relevant information retrieval.
    *   "Concept Pipelines": A more formalized way to define and execute generation sequences.
    *   Better handling of specific scene types (e.g., flags for scenes requiring careful generation, or allowing user to write them).
*   **Tasks:**
    1.  **Chat UI/Backend:** Integrate a chat component.
    2.  **RAG Implementation:** Set up vector DB, embedding models, retrieval logic.
    3.  **Contextual Prompting:** Refine prompts to leverage precise RAG results.
    4.  **Advanced Editing Features:** Explore how to offer more granular control over text, perhaps inspired by code editors.

**Future Considerations (Post v1.0):**

*   Multi-user collaboration.
*   Integration with existing writing tools (Scrivener, etc.).
*   Specialized LLMs for different genres or tasks.
*   Community features for sharing prompts or story structures.
*   Mechanisms for introducing "controlled noise" or "serendipity" into generation.

This detailed plan should give you a solid roadmap. Remember that each phase, especially prompt engineering, will involve significant iteration and experimentation. Good luck!