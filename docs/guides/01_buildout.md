Okay, I will help you implement "Phase 1" (v0.1 - Core Narrative Scaffolding & Scene Generation) of your SystemaWriter project. This will involve creating a new feature within your existing full-stack application structure.

We'll build:
1.  **Backend (FastAPI):** API endpoints to handle each step of the story generation process (Outline, Worldbuilding, Scene Breakdowns, Scene Narrative). This will involve integrating with an LLM (e.g., OpenAI).
2.  **Frontend (React):** A new page with a multi-step UI allowing the user to input their concept, receive generated content from the backend, review/approve it, and proceed to the next step.

Here's the plan broken down:

**I. Backend Implementation (`repo_src/backend/`)**

1.  **Dependencies:**
    *   Add `openai` (or your chosen LLM SDK) to `repo_src/backend/requirements.txt`.
    *   Add your LLM API key (e.g., `OPENAI_API_KEY`) to `repo_src/backend/.env` (ensure this file is gitignored and you have a `.env.example` or similar).

2.  **New Python Modules for SystemaWriter:**
    *   `repo_src/backend/systemawriter_logic/`:
        *   `llm_interface.py`: Handles communication with the LLM.
        *   `prompts.py`: Contains prompt templates for each generation stage.
        *   `core_logic.py`: Orchestrates the generation steps using the LLM and prompts.
    *   `repo_src/backend/routers/systemawriter_router.py`: FastAPI router with endpoints for each step.
    *   `repo_src/backend/data/systemawriter_schemas.py`: Pydantic schemas for API request/response validation.

3.  **API Endpoints (in `systemawriter_router.py`):**
    *   `POST /api/systemawriter/generate-outline`:
        *   Input: Concept document text, (optional) context summary/text.
        *   Output: Generated outline (Markdown).
    *   `POST /api/systemawriter/generate-worldbuilding`:
        *   Input: Concept, approved outline, (optional) context.
        *   Output: Generated worldbuilding document (Markdown).
    *   `POST /api/systemawriter/generate-scene-breakdowns`:
        *   Input: Concept, approved outline, approved worldbuilding, (optional) context.
        *   Output: Scene breakdowns per chapter (e.g., JSON object with chapter titles as keys and Markdown breakdowns as values).
    *   `POST /api/systemawriter/generate-scene-narrative`:
        *   Input: Specific scene plan (from breakdown), chapter context, worldbuilding, outline, (optional) general context.
        *   Output: Generated scene narrative (Markdown).

**II. Frontend Implementation (`repo_src/frontend/`)**

1.  **New Components & Page:**
    *   `repo_src/frontend/src/pages/SystemaWriterPage.tsx`: Main page for the feature, managing the multi-step workflow.
    *   Components for each step (e.g., `ConceptInputForm.tsx`, `DisplayGeneratedContent.tsx`, `ApprovalControls.tsx`).
    *   Will use a state management approach (e.g., React's `useState`, `useReducer`, or a library if the project uses one) to hold the concept, generated content at each stage, and user approvals/edits.

2.  **API Service:**
    *   `repo_src/frontend/src/services/systemaWriterService.ts`: Functions to make `fetch` calls to the backend SystemaWriter API endpoints.

3.  **UI Flow:**
    1.  User inputs concept document text.
    2.  Clicks "Generate Outline" -> Calls backend.
    3.  Frontend displays Outline -> User reviews (optionally edits in a textarea).
    4.  Clicks "Approve Outline & Generate Worldbuilding" -> Calls backend with approved outline.
    5.  Frontend displays Worldbuilding -> User reviews/approves.
    6.  ...and so on for Scene Breakdowns and Scene Narratives.

**III. Documentation & Setup**

1.  **README Updates:**
    *   Add a section to the main `README.md` about the SystemaWriter feature.
    *   Create `docs/systemawriter_usage.md` with instructions for the user, including the "Input Document Checklist".

---

Here are the file changes and new files:

```diff
--- a/.gitignore
+++ b/.gitignore
@@ -64,6 +64,10 @@
 # Generated files
 docs/living_context/*.md
 
+# SystemaWriter generated outputs (if saved server-side, illustrative)
+server_data/systemawriter_runs/
+
+
 # Keep .gitkeep files
 !**/.gitkeep
 # Python virtual environments
--- a/README.md
+++ b/README.md
@@ -63,3 +63,11 @@
 ## 📄 License
 
 ISC
+
+## 📖 SystemaWriter - AI-Assisted Narrative Generation (v0.1)
+
+This project includes **SystemaWriter**, an AI-powered system that collaborates with a user to transform initial ideas and contextual information into well-structured short stories.
+
+**To use SystemaWriter:**
+1. Navigate to the SystemaWriter page in the frontend application.
+2. Follow the on-screen steps to input your story concept, review AI-generated outlines, worldbuilding details, scene breakdowns, and finally, scene narratives.
+3. For detailed input guidelines, refer to [docs/systemawriter_usage.md](docs/systemawriter_usage.md).
--- a/repo_src/backend/.env.example # Create this if it doesn't exist, or add to existing
+++ b/repo_src/backend/.env.example
@@ -0,0 +1,5 @@
+# Backend Environment Variables Example
+DATABASE_URL=sqlite:///./app_dev.db
+PORT=8000
+LOG_LEVEL=info
+OPENAI_API_KEY="your_openai_api_key_here"
--- a/repo_src/backend/main.py
+++ b/repo_src/backend/main.py
@@ -25,6 +25,7 @@
 # as db connection might depend on them.
 from repo_src.backend.database.setup import init_db
 from repo_src.backend.database import models, connection # For example endpoints
+from repo_src.backend.routers import systemawriter_router # Import the SystemaWriter router
 from repo_src.backend.functions.items import router as items_router # Import the items router
 
 @asynccontextmanager
@@ -49,6 +50,7 @@
 
 # Include the items router
 app.include_router(items_router)
+app.include_router(systemawriter_router.router, prefix="/api/systemawriter", tags=["systemawriter"])
 
 @app.get("/")
 async def read_root():
--- a/repo_src/backend/requirements.txt
+++ b/repo_src/backend/requirements.txt
@@ -3,4 +3,5 @@
 sqlalchemy
 pydantic
 python-dotenv
+openai # For SystemaWriter LLM interaction
 psycopg2-binary # Keep if you plan to support PostgreSQL, otherwise remove for pure SQLite
--- a/repo_src/frontend/src/App.tsx
+++ b/repo_src/frontend/src/App.tsx
@@ -1,7 +1,10 @@
 import { useState, useEffect } from 'react'
-import './styles/App.css'
-import ItemForm from './components/ItemForm'
-import ItemList from './components/ItemList'
+import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
+import './styles/App.css' // General App styles
+import ItemManagementPage from './pages/ItemManagementPage'; // Assuming Item CRUD is moved here
+import SystemaWriterPage from './pages/SystemaWriterPage'; // New page
+import HomePage from './pages/HomePage';
+
 
 // Define item type
 interface Item {
@@ -13,98 +16,35 @@
 }
 
 function App() {
-  const [items, setItems] = useState<Item[]>([])
-  const [loading, setLoading] = useState(true)
-  const [error, setError] = useState<string | null>(null)
-
-  // Fetch items from the API
-  const fetchItems = async () => {
-    try {
-      setLoading(true)
-      const response = await fetch('/api/items')
-      if (!response.ok) {
-        throw new Error(`Error fetching items: ${response.status}`)
-      }
-      const data = await response.json()
-      setItems(data)
-      setError(null)
-    } catch (err) {
-      console.error('Error fetching items:', err)
-      setError(err instanceof Error ? err.message : 'Unknown error')
-    } finally {
-      setLoading(false)
-    }
-  }
-
-  // Add a new item
-  const addItem = async (name: string, description: string) => {
-    try {
-      const response = await fetch('/api/items/', {
-        method: 'POST',
-        headers: {
-          'Content-Type': 'application/json',
-        },
-        body: JSON.stringify({ name, description }),
-      })
-      
-      if (!response.ok) {
-        throw new Error(`Error creating item: ${response.status}`)
-      }
-      
-      // Refresh the items list
-      fetchItems()
-    } catch (err) {
-      console.error('Error adding item:', err)
-      setError(err instanceof Error ? err.message : 'Unknown error')
-    }
-  }
-
-  // Delete an item
-  const deleteItem = async (id: number) => {
-    try {
-      const response = await fetch(`/api/items/${id}`, {
-        method: 'DELETE',
-      })
-      
-      if (!response.ok) {
-        throw new Error(`Error deleting item: ${response.status}`)
-      }
-      
-      // Refresh the items list
-      fetchItems()
-    } catch (err) {
-      console.error('Error deleting item:', err)
-      setError(err instanceof Error ? err.message : 'Unknown error')
-    }
-  }
-
-  // Fetch items on component mount
-  useEffect(() => {
-    fetchItems()
-  }, [])
+  const [message, setMessage] = useState('');
+  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
 
   return (
-    <div className="container">
-      <h1>AI-Friendly Repository</h1>
-      
-      <div className="card">
-        <h2>Add New Item</h2>
-        <ItemForm onAddItem={addItem} />
-      </div>
-      
-      <div className="card">
-        <h2>Items</h2>
-        {loading ? (
-          <p>Loading items...</p>
-        ) : error ? (
-          <p className="error">Error: {error}</p>
-        ) : items.length === 0 ? (
-          <p>No items found. Add some!</p>
-        ) : (
-          <ItemList items={items} onDeleteItem={deleteItem} />
-        )}
-      </div>
-    </div>
+    <Router>
+      <div className="app-container">
+        <nav className="main-nav">
+          <ul>
+            <li><Link to="/">Home</Link></li>
+            <li><Link to="/items">Item Management</Link></li>
+            <li><Link to="/systemawriter">SystemaWriter</Link></li>
+          </ul>
+        </nav>
+        <main className="main-content">
+          <Routes>
+            <Route path="/" element={<HomePage apiUrl={apiUrl} />} />
+            <Route path="/items" element={<ItemManagementPage apiUrl={apiUrl} />} />
+            <Route path="/systemawriter" element={<SystemaWriterPage apiUrl={apiUrl} />} />
+            <Route path="*" element={<Navigate to="/" replace />} />
+          </Routes>
+        </main>
+        <footer className="app-footer">
+          <p>&copy; 2024 AI-Friendly Repository</p>
+          <p>Backend API URL for Vite: {apiUrl}</p>
+        </footer>
+      </div>
+    </Router>
   )
 }
 
 export default App
-
--- a/repo_src/frontend/src/styles/App.css
+++ b/repo_src/frontend/src/styles/App.css
@@ -1,9 +1,29 @@
-.container {
+/* General App Structure */
+.app-container {
+  display: flex;
+  flex-direction: column;
+  min-height: 100vh;
+}
+
+.main-nav {
+  background-color: #2c2c2c; /* Darker shade for nav */
+  padding: 10px 20px;
+  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
+}
+
+.main-nav ul {
+  list-style: none;
+  padding: 0;
+  margin: 0;
+  display: flex;
+}
+
+.main-nav li {
+  margin-right: 20px;
+}
+
+.main-nav a {
+  color: #64cfff; /* Light blue for links */
+  text-decoration: none;
+  font-weight: bold;
+}
+
+.main-nav a:hover {
+  text-decoration: underline;
+}
+
+.main-content {
+  flex-grow: 1;
   width: 100%;
   max-width: 800px;
   margin: 0 auto;
+  padding: 20px; /* Added padding to main content area */
 }
 
 .card {
@@ -66,6 +86,13 @@
   margin-left: 10px;
 }
 
+.app-footer {
+  background-color: #2c2c2c;
+  color: #aaa;
+  text-align: center;
+  padding: 15px;
+  font-size: 0.9em;
+}
 @media (prefers-color-scheme: light) {
   .card {
     background-color: #f9f9f9;
@@ -85,4 +112,17 @@
   .item-description {
     color: #666;
   }
+  .main-nav {
+    background-color: #e9e9e9; /* Lighter nav for light mode */
+  }
+  .main-nav a {
+    color: #007bff; /* Standard blue for links in light mode */
+  }
+   .app-footer {
+    background-color: #e9e9e9;
+    color: #555;
+  }
 } 
+
+
+
```

**New Files to be Created:**

1.  `docs/systemawriter_usage.md`
2.  `repo_src/backend/systemawriter_logic/__init__.py`
3.  `repo_src/backend/systemawriter_logic/llm_interface.py`
4.  `repo_src/backend/systemawriter_logic/prompts.py`
5.  `repo_src/backend/systemawriter_logic/core_logic.py`
6.  `repo_src/backend/data/systemawriter_schemas.py`
7.  `repo_src/backend/routers/systemawriter_router.py`
8.  `repo_src/frontend/src/pages/HomePage.tsx`
9.  `repo_src/frontend/src/pages/ItemManagementPage.tsx` (refactored from `App.tsx`)
10. `repo_src/frontend/src/pages/SystemaWriterPage.tsx`
11. `repo_src/frontend/src/services/systemaWriterService.ts`
12. `repo_src/frontend/src/components/LoadingSpinner.tsx` (simple utility component)
13. `repo_src/frontend/src/styles/SystemaWriter.css`

---
**File: `docs/systemawriter_usage.md`**
```markdown
# SystemaWriter Usage Guide (v0.1)

SystemaWriter is an AI-assisted tool to help you generate structured narratives from your ideas. This guide explains how to use the v0.1 features.

## How to Use

1.  **Navigate to SystemaWriter:** In the application, find and open the "SystemaWriter" page.
2.  **Step 1: Input Concept**
    *   In the "Story Concept" text area, provide your initial ideas. Refer to the "Concept Document Checklist" below for what to include.
    *   Click "Generate Outline".
3.  **Step 2: Review & Approve Outline**
    *   The AI will generate a story outline based on your concept.
    *   Review the generated outline. You can make edits directly in the text area if needed.
    *   Click "Approve Outline & Generate Worldbuilding".
4.  **Step 3: Review & Approve Worldbuilding**
    *   The AI will generate worldbuilding details (characters, setting, etc.) based on your concept and the approved outline.
    *   Review and edit as necessary.
    *   Click "Approve Worldbuilding & Generate Scene Breakdowns".
5.  **Step 4: Review & Approve Scene Breakdowns**
    *   The AI will break down each chapter (from the outline) into a series of scenes, detailing goals and key events for each.
    *   Review these breakdowns. Edits are possible but might be simpler to refine prompts for future versions if major changes are needed.
    *   For each scene you want to write, click "Generate Narrative for this Scene". *(Note: v0.1 might generate one scene at a time or require selection).*
6.  **Step 5: Review Scene Narrative**
    *   The AI will generate the narrative text for the selected scene.
    *   Review the generated text.

## Concept Document Checklist

When providing your "Story Concept", try to include the following for best results:

1.  **High-Level Premise:** The core idea of the story in 1-3 sentences.
    *   *Example: "A young farmhand discovers an ancient artifact that grants them forbidden magic, forcing them to flee their village and confront a tyrannical empire."*
2.  **Genre:** Specify the primary genre(s).
    *   *Examples: Sci-Fi, High Fantasy, Cultivation Novel, Urban Fantasy, Mystery, Thriller.*
3.  **Key Tropes/Elements (Optional):** List any specific tropes you want to include or avoid.
    *   *Examples: "Include: chosen one, mentor figure, magical academy. Avoid: love triangles."*
4.  **Core Themes (Optional):** What are the underlying messages or ideas?
    *   *Examples: "Themes of rebellion against oppression, the price of power, found family."*
5.  **Main Character(s) Idea:** Briefly describe your main character(s) or their archetypes.
    *   *Example: "MC: Elara, curious and headstrong, initially naive but resourceful. Antagonist: General Varkos, ruthless and believes order justifies any means."*
6.  **Setting Snippet (Optional):** A few words about the world.
    *   *Example: "Setting: A medieval world where magic is outlawed, known as Aerthos."*
7.  **Target Audience/Tone (Optional):** Who is this story for? What's the overall feeling?
    *   *Examples: Young Adult (YA), Grimdark, Humorous, Epic, Introspective.*
8.  **Desired Length Indication (Optional for v0.1):** Helps the AI scope its responses (e.g., short story, first chapter of a novel).
9.  **Key Plot Beats (Optional but Recommended for Cohesion):** If you have 2-5 major events or turning points in mind, list them briefly.
    *   *Example: "1. Discovery of artifact. 2. Village attacked. 3. Meets mentor. 4. Infiltrates capital. 5. Confronts General Varkos."*

Providing clear and concise information in your concept document will significantly improve the quality and relevance of the AI's generations.
```

---
**File: `repo_src/backend/systemawriter_logic/__init__.py`**
```python
# This file makes Python treat the `systemawriter_logic` directory as a package.
```

---
**File: `repo_src/backend/systemawriter_logic/llm_interface.py`**
```python
import os
import openai
from dotenv import load_dotenv

# Load environment variables from .env file which should be in the backend directory
# For production, environment variables should be set through the deployment environment.
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '..', '.env') # Assumes .env is in backend/

if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback if .env is not in backend/ but in project root, though backend/.env is preferred.
    project_root_env = os.path.join(current_dir, '..', '..', '..', '.env')
    if os.path.exists(project_root_env):
        load_dotenv(dotenv_path=project_root_env)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found. LLM calls will fail.")
else:
    openai.api_key = OPENAI_API_KEY

async def ask_llm(prompt_text: str, system_message: str = "You are a helpful assistant specializing in creative writing and story structuring.") -> str:
    """
    Sends a prompt to the OpenAI LLM and returns the response.
    """
    if not OPENAI_API_KEY:
        return "Error: OPENAI_API_KEY not configured."

    try:
        # Using the new OpenAI API structure (v1.0.0+)
        # For older versions, the API call structure might be different.
        # Consider making this truly async if FastAPI endpoints are async and LLM client supports it.
        # For now, using the synchronous client for simplicity in a potentially async FastAPI route.
        # If openai.ChatCompletion.create is blocking, run it in a thread pool executor for async routes.
        
        # This example uses a simplified synchronous call pattern.
        # For production, you might want to use `openai.AsyncOpenAI` client
        # and `await client.chat.completions.create(...)`
        
        # For simplicity in this example, we'll use a blocking call.
        # In a real async FastAPI app, you'd use `await asyncio.to_thread(blocking_function)`
        # or an async OpenAI client.
        
        completion = openai.chat.completions.create(
            model="gpt-3.5-turbo", # Or "gpt-4" or other preferred model
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.7,
            max_tokens=2048, # Adjust as needed
        )
        response_content = completion.choices[0].message.content
        return response_content.strip() if response_content else "Error: No content in LLM response."
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return f"Error: Could not get response from LLM. Details: {str(e)}"

```

---
**File: `repo_src/backend/systemawriter_logic/prompts.py`**
```python
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
For example:
## Chapter 1: The Discovery
- Elara finds the artifact.
- Village elders are suspicious.

## Chapter 2: The Flight
- The empire's soldiers arrive.
- Elara escapes with the help of a mysterious stranger.

Focus on a logical flow and ensure key elements from the concept are addressed.
If the concept implies a short story, provide 5-7 major plot beats instead of chapters.
The user's concept document guidelines were:
{CONCEPT_DOCUMENT_GUIDE}

Generate the outline now:
"""
    return prompt

def get_worldbuilding_prompt(concept_document: str, approved_outline: str, context_summary: str = "") -> str:
    prompt = f"""
You are a worldbuilding assistant. Based on the provided story concept and the approved story outline, expand on the worldbuilding details.
Generate a Markdown document with the following sections:
### Main Characters
- For each main character hinted at in the concept or outline:
  - Name (suggest if not provided)
  - Brief Description (appearance, core personality traits)
  - Motivations
  - Potential Arc (how they might change or what they might achieve based on the outline)

### Setting Details
- Key Locations mentioned or implied by the outline.
- Time Period/Technology Level (e.g., medieval, futuristic).
- Culture Snippets (e.g., societal norms, beliefs if hinted).
- Magic System/Unique World Rules (if applicable, explain briefly how it works or its impact).

### Other Key Elements (Optional)
- Factions, organizations, or groups.
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

```

---
**File: `repo_src/backend/systemawriter_logic/core_logic.py`**
```python
from .llm_interface import ask_llm
from . import prompts
import re # For parsing chapter titles from outline

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
    context_files_content: list[str] = None # context_summary not directly used in breakdown prompt but good to have
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
    scene_plan_from_breakdown: str, # This is the specific plan for ONE scene
    chapter_title: str,
    full_chapter_scene_breakdown: str, # Full breakdown for the current chapter
    approved_worldbuilding: str,
    full_approved_outline: str,
    # context_files_content: list[str] = None, # Not directly used here, but could add writing style from context
    writing_style_notes: str = "" # User can provide style notes
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

```

---
**File: `repo_src/backend/data/systemawriter_schemas.py`**
```python
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
```

---
**File: `repo_src/backend/routers/systemawriter_router.py`**
```python
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

```

---
**File: `repo_src/frontend/src/pages/HomePage.tsx`**
```tsx
import React, { useState, useEffect } from 'react';

interface HomePageProps {
  apiUrl: string;
}

const HomePage: React.FC<HomePageProps> = ({ apiUrl }) => {
  const [backendMessage, setBackendMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/hello`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        setBackendMessage(data.message);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching hello API:", error);
        setBackendMessage(`Failed to fetch message from backend: ${error.message}`);
        setLoading(false);
      });
  }, [apiUrl]);

  return (
    <div className="page-container">
      <h1>Welcome to the AI-Friendly Repository!</h1>
      <p>This is the central hub for your application.</p>
      <p>Navigate using the links above to access different features like Item Management or the SystemaWriter.</p>
      
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Backend Status</h2>
        {loading ? (
          <p>Loading status from backend...</p>
        ) : (
          <p>Message from backend (/api/hello): <strong>{backendMessage}</strong></p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
```

---
**File: `repo_src/frontend/src/pages/ItemManagementPage.tsx`**
```tsx
import React, { useState, useEffect } from 'react';
import ItemForm from '../components/ItemForm'; // Assuming ItemForm is in components/
import ItemList from '../components/ItemList';   // Assuming ItemList is in components/
// You might need to adjust paths if ItemForm/ItemList are elsewhere or create them

interface Item {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemManagementPageProps {
  apiUrl: string;
}

const ItemManagementPage: React.FC<ItemManagementPageProps> = ({ apiUrl }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsApiUrl = `${apiUrl}/api/items`;

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(itemsApiUrl);
      if (!response.ok) {
        throw new Error(`Error fetching items: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setItems(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching items:', err);
      setError(err.message || 'Unknown error fetching items');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (name: string, description: string) => {
    try {
      const response = await fetch(`${itemsApiUrl}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Error creating item: ${response.status}` }));
        throw new Error(errorData.detail || `Error creating item: ${response.status}`);
      }
      fetchItems(); // Refresh list
    } catch (err: any) {
      console.error('Error adding item:', err);
      setError(err.message || 'Unknown error adding item');
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const response = await fetch(`${itemsApiUrl}/${id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) { // 204 No Content is success for DELETE
        const errorData = await response.json().catch(() => ({ detail: `Error deleting item: ${response.status}` }));
        throw new Error(errorData.detail || `Error deleting item: ${response.status}`);
      }
      fetchItems(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Unknown error deleting item');
    }
  };

  useEffect(() => {
    fetchItems();
  }, [itemsApiUrl]); // Re-fetch if apiUrl changes (though unlikely for this prop)

  return (
    <div className="page-container">
      <h1>Item Management</h1>
      <p>Create, view, and delete items stored in the backend.</p>

      <div className="card">
        <h2>Add New Item</h2>
        <ItemForm onAddItem={addItem} />
      </div>

      <div className="card">
        <h2>Current Items</h2>
        {loading ? (
          <p>Loading items...</p>
        ) : error ? (
          <p className="error">Error: {error}</p>
        ) : items.length === 0 ? (
          <p>No items found. Add some!</p>
        ) : (
          <ItemList items={items} onDeleteItem={deleteItem} />
        )}
      </div>
    </div>
  );
};

export default ItemManagementPage;
```

---
**File: `repo_src/frontend/src/pages/SystemaWriterPage.tsx`**
```tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
    generateOutline, 
    generateWorldbuilding, 
    generateSceneBreakdowns, 
    generateSceneNarrative 
} from '../services/systemaWriterService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/SystemaWriter.css'; // We'll create this file

type CurrentStep = 
    | 'concept' 
    | 'outline' 
    | 'worldbuilding' 
    | 'scene_breakdowns' 
    | 'scene_narrative';

interface SceneBreakdownData {
    [chapterTitle: string]: string; // Markdown for each chapter's breakdown
}

interface SceneToGenerate {
    chapterTitle: string;
    scenePlan: string; // The specific plan for this one scene
    fullChapterBreakdown: string; // Full breakdown for its chapter
}

const SystemaWriterPage: React.FC<{ apiUrl: string }> = ({ apiUrl }) => {
    const [currentStep, setCurrentStep] = useState<CurrentStep>('concept');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [conceptDoc, setConceptDoc] = useState('');
    
    const [generatedOutline, setGeneratedOutline] = useState('');
    const [approvedOutline, setApprovedOutline] = useState('');
    
    const [generatedWorldbuilding, setGeneratedWorldbuilding] = useState('');
    const [approvedWorldbuilding, setApprovedWorldbuilding] = useState('');

    const [generatedSceneBreakdowns, setGeneratedSceneBreakdowns] = useState<SceneBreakdownData | null>(null);
    // For simplicity, direct approval of breakdowns as a whole for v0.1. 
    // Individual scene editing/approval would be more complex.
    
    const [sceneToGenerate, setSceneToGenerate] = useState<SceneToGenerate | null>(null);
    const [generatedSceneNarrative, setGeneratedSceneNarrative] = useState('');
    
    const [writingStyleNotes, setWritingStyleNotes] = useState('');


    const handleGenerateOutline = async () => {
        if (!conceptDoc.trim()) {
            setError("Please provide a story concept.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateOutline(apiUrl, { concept_document: conceptDoc });
            setGeneratedOutline(data.outline_md);
            setApprovedOutline(data.outline_md); // Pre-fill for editing
            setCurrentStep('outline');
        } catch (err: any) {
            setError(err.message || "Failed to generate outline.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateWorldbuilding = async () => {
        if (!approvedOutline.trim()) {
            setError("Approved outline is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateWorldbuilding(apiUrl, { 
                concept_document: conceptDoc, // Pass original concept too
                approved_outline_md: approvedOutline 
            });
            setGeneratedWorldbuilding(data.worldbuilding_md);
            setApprovedWorldbuilding(data.worldbuilding_md);
            setCurrentStep('worldbuilding');
        } catch (err: any) {
            setError(err.message || "Failed to generate worldbuilding.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSceneBreakdowns = async () => {
        if (!approvedWorldbuilding.trim()) {
            setError("Approved worldbuilding is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateSceneBreakdowns(apiUrl, {
                approved_outline_md: approvedOutline,
                approved_worldbuilding_md: approvedWorldbuilding
            });
            setGeneratedSceneBreakdowns(data.scene_breakdowns_by_chapter);
            setCurrentStep('scene_breakdowns');
        } catch (err: any) {
            setError(err.message || "Failed to generate scene breakdowns.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Helper to parse individual scene plans from a chapter's breakdown markdown
    // This is a simplification; robust parsing might need more complex logic or backend support
    const extractScenePlans = (chapterBreakdownMd: string): string[] => {
        if (!chapterBreakdownMd) return [];
        // Assuming scenes start with "- **Scene Number:**" or similar identifiable pattern
        const scenes = chapterBreakdownMd.split(/\n-\s*\*\*(Scene Number|Scene \d+\.\d+):\*\*/i);
        return scenes.slice(1).map((s, i) => i % 2 === 0 ? `- **Scene...` : s.trim()).filter(s => s.length > 10); // very rough
    };


    const handleSelectSceneForNarrative = (chapterTitle: string, sceneIndex: number, fullChapterBreakdown: string) => {
        // This is a placeholder. A more robust way to get individual scene plans is needed.
        // For now, let's assume the user will copy-paste or we send a chunk.
        // For v0.1, we might just send the chapter breakdown and ask LLM for a specific scene *within* it.
        // Or, the UI would present selectable scene plans.
        
        // Simplified: Let user pick from breakdown, or type/paste the scene plan.
        // For actual generation, the `scene_plan_from_breakdown` field is critical.
        // Here, we'll set up a basic structure; UI needs refinement for scene selection.
        const scenePlanPlaceholder = `Plan for scene ${sceneIndex + 1} of chapter "${chapterTitle}" (User should provide this or select from a parsed list)`;
        
        // A better approach would be for the backend to return structured scene plans.
        // For now, let's assume the user identifies the scene plan from the displayed markdown.
        const plan = prompt(`Enter/paste the specific plan for the scene you want to generate from chapter "${chapterTitle}":\n(Find this in the scene breakdown text shown)`, 
                            `Example: - Goal: Introduce the villain... - Characters: Hero, Villain...`);
        if (!plan) return;

        setSceneToGenerate({
            chapterTitle,
            scenePlan: plan,
            fullChapterBreakdown
        });
        setGeneratedSceneNarrative(''); // Clear previous narrative
        setCurrentStep('scene_narrative'); // Move to narrative step (which will now show input for plan if not already set)
    };


    const handleGenerateSceneNarrative = async () => {
        if (!sceneToGenerate || !sceneToGenerate.scenePlan.trim()) {
            setError("Scene plan to generate is missing or empty.");
            return;
        }
        if (!approvedOutline.trim() || !approvedWorldbuilding.trim()) {
            setError("Approved outline or worldbuilding is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await generateSceneNarrative(apiUrl, {
                scene_plan_from_breakdown: sceneToGenerate.scenePlan,
                chapter_title: sceneToGenerate.chapterTitle,
                full_chapter_scene_breakdown: sceneToGenerate.fullChapterBreakdown,
                approved_worldbuilding_md: approvedWorldbuilding,
                full_approved_outline_md: approvedOutline,
                writing_style_notes: writingStyleNotes || undefined
            });
            setGeneratedSceneNarrative(data.scene_narrative_md);
            // User can then copy this, or we can add "save" or "add to story" features later.
        } catch (err: any) {
            setError(err.message || "Failed to generate scene narrative.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="systemawriter-container page-container">
            <h1>SystemaWriter - AI Story Generation</h1>
            {error && <p className="error-message">Error: {error}</p>}
            {isLoading && <LoadingSpinner />}

            {currentStep === 'concept' && (
                <div className="step-card">
                    <h2>Step 1: Story Concept</h2>
                    <p>Provide your core story idea, genre, key characters, plot points, etc. The more detail, the better!</p>
                    <a href="/docs/systemawriter_usage.md" target="_blank" rel="noopener noreferrer">View Concept Document Checklist</a>
                    <textarea
                        value={conceptDoc}
                        onChange={(e) => setConceptDoc(e.target.value)}
                        placeholder="Enter your story concept here..."
                        rows={15}
                        disabled={isLoading}
                    />
                    <button onClick={handleGenerateOutline} disabled={isLoading || !conceptDoc.trim()}>
                        Generate Outline
                    </button>
                </div>
            )}

            {currentStep === 'outline' && (
                <div className="step-card">
                    <h2>Step 2: Review & Approve Outline</h2>
                    <p>Review the generated outline. You can edit it below before proceeding.</p>
                    <textarea
                        value={approvedOutline}
                        onChange={(e) => setApprovedOutline(e.target.value)}
                        rows={20}
                        disabled={isLoading}
                    />
                    <div className="generated-content-preview">
                        <h3>Original Generated Outline:</h3>
                        <ReactMarkdown>{generatedOutline}</ReactMarkdown>
                    </div>
                    <button onClick={() => setCurrentStep('concept')}>&laquo; Back to Concept</button>
                    <button onClick={handleGenerateWorldbuilding} disabled={isLoading || !approvedOutline.trim()}>
                        Approve Outline & Generate Worldbuilding &raquo;
                    </button>
                </div>
            )}

            {currentStep === 'worldbuilding' && (
                 <div className="step-card">
                    <h2>Step 3: Review & Approve Worldbuilding</h2>
                    <p>Review the generated worldbuilding details. Edit as needed.</p>
                    <textarea
                        value={approvedWorldbuilding}
                        onChange={(e) => setApprovedWorldbuilding(e.target.value)}
                        rows={20}
                        disabled={isLoading}
                    />
                     <div className="generated-content-preview">
                        <h3>Original Generated Worldbuilding:</h3>
                        <ReactMarkdown>{generatedWorldbuilding}</ReactMarkdown>
                    </div>
                    <button onClick={() => setCurrentStep('outline')}>&laquo; Back to Outline</button>
                    <button onClick={handleGenerateSceneBreakdowns} disabled={isLoading || !approvedWorldbuilding.trim()}>
                        Approve Worldbuilding & Generate Scene Breakdowns &raquo;
                    </button>
                </div>
            )}

            {currentStep === 'scene_breakdowns' && generatedSceneBreakdowns && (
                <div className="step-card">
                    <h2>Step 4: Review Scene Breakdowns & Select Scene for Narrative</h2>
                    <p>Below are scene breakdowns for each chapter. Review them. To generate a narrative for a specific scene, you'll need its plan.</p>
                    {Object.entries(generatedSceneBreakdowns).map(([chapterTitle, breakdownMd]) => (
                        <div key={chapterTitle} className="chapter-breakdown">
                            <h3>{chapterTitle}</h3>
                            <ReactMarkdown>{breakdownMd}</ReactMarkdown>
                            {/* For v0.1, scene selection is simplified via prompt.
                                A better UI would parse scenes and make them individually clickable. */}
                            <button 
                                onClick={() => handleSelectSceneForNarrative(chapterTitle, 0, breakdownMd)}
                                disabled={isLoading}
                                title={`You will be prompted to provide the specific scene plan from the breakdown above for chapter: ${chapterTitle}`}
                                >
                                Generate Narrative for a Scene in "{chapterTitle}"...
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setCurrentStep('worldbuilding')}>&laquo; Back to Worldbuilding</button>
                </div>
            )}
            
            {currentStep === 'scene_narrative' && sceneToGenerate && (
                <div className="step-card">
                    <h2>Step 5: Generate Scene Narrative</h2>
                    <p>Generating narrative for a scene in chapter: <strong>{sceneToGenerate.chapterTitle}</strong></p>
                    <div>
                        <label htmlFor="scenePlanInput">Specific Scene Plan (from breakdown):</label>
                        <textarea
                            id="scenePlanInput"
                            value={sceneToGenerate.scenePlan}
                            onChange={(e) => setSceneToGenerate(prev => prev ? {...prev, scenePlan: e.target.value} : null)}
                            rows={8}
                            placeholder="Paste or type the specific plan for the scene to be written here..."
                            disabled={isLoading}
                        />
                    </div>
                     <div>
                        <label htmlFor="writingStyleNotes">Optional Writing Style Notes:</label>
                        <input 
                            type="text"
                            id="writingStyleNotes"
                            value={writingStyleNotes}
                            onChange={(e) => setWritingStyleNotes(e.target.value)}
                            placeholder="e.g., Tense, past-tense, focus on character's internal thoughts"
                            disabled={isLoading}
                        />
                    </div>
                    <button onClick={handleGenerateSceneNarrative} disabled={isLoading || !sceneToGenerate.scenePlan.trim()}>
                        Generate Scene Narrative
                    </button>
                    
                    {generatedSceneNarrative && (
                        <div className="generated-content-preview" style={{marginTop: '20px'}}>
                            <h3>Generated Scene Narrative:</h3>
                            <ReactMarkdown>{generatedSceneNarrative}</ReactMarkdown>
                        </div>
                    )}
                    <button onClick={() => { setCurrentStep('scene_breakdowns'); setSceneToGenerate(null); setGeneratedSceneNarrative(''); }}>
                        &laquo; Back to Scene Breakdowns
                    </button>
                </div>
            )}

        </div>
    );
};

export default SystemaWriterPage;
```

---
**File: `repo_src/frontend/src/services/systemaWriterService.ts`**
```typescript
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
```

---
**File: `repo_src/frontend/src/components/LoadingSpinner.tsx`**
```tsx
import React from 'react';
import './LoadingSpinner.css'; // We'll create this CSS file

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner"></div>
      <p>Loading, please wait...</p>
    </div>
  );
};

export default LoadingSpinner;
```

---
**File: `repo_src/frontend/src/components/LoadingSpinner.css`**
```css
.loading-spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  color: white;
}

.loading-spinner {
  border: 8px solid #f3f3f3; /* Light grey */
  border-top: 8px solid #64cfff; /* Blue */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner-overlay p {
  font-size: 1.2em;
}
```

---
**File: `repo_src/frontend/src/styles/SystemaWriter.css`**
```css
.systemawriter-container {
    /* Styles specific to SystemaWriter page can go here */
}

.step-card {
    background-color: var(--card-bg-color, #2f2f2f); /* Use CSS variable or default */
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 25px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.step-card h2 {
    margin-top: 0;
    color: var(--heading-color, #64cfff); /* Light blue for headings */
    border-bottom: 1px solid var(--border-color, #444);
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.systemawriter-container textarea,
.systemawriter-container input[type="text"] {
    width: 100%;
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    border: 1px solid var(--input-border-color, #555);
    background-color: var(--input-bg-color, #3a3a3a);
    color: var(--text-color, #e0e0e0);
    font-family: inherit;
    font-size: 1em;
    box-sizing: border-box; /* Important for 100% width */
}

.systemawriter-container button {
    background-color: var(--button-primary-bg, #64cfff);
    color: var(--button-primary-text, #1a1a1a);
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
    transition: background-color 0.2s ease;
    margin-right: 10px;
    margin-top: 10px;
}

.systemawriter-container button:hover:not(:disabled) {
    background-color: var(--button-primary-hover-bg, #88dfff);
}

.systemawriter-container button:disabled {
    background-color: var(--button-disabled-bg, #555);
    cursor: not-allowed;
}

.systemawriter-container button + button { /* Add space between adjacent buttons */
    /* margin-left: 10px; */ /* Handled by margin-right on all buttons */
}


.generated-content-preview {
    margin-top: 20px;
    padding: 15px;
    background-color: var(--preview-bg-color, #282828);
    border-radius: 4px;
    border: 1px solid var(--preview-border-color, #404040);
}

.generated-content-preview h3 {
    margin-top: 0;
    color: var(--preview-heading-color, #a0dfff);
}

.chapter-breakdown {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed var(--border-color, #444);
}
.chapter-breakdown h3 {
    color: var(--preview-heading-color, #a0dfff);
}

.error-message {
    color: var(--error-text-color, #ff6b6b);
    background-color: var(--error-bg-color, #442222);
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid var(--error-border-color, #663333);
}

/* For light mode adjustments if your global styles don't cover these variables */
@media (prefers-color-scheme: light) {
    .step-card {
        --card-bg-color: #f9f9f9;
        --heading-color: #007bff;
        --border-color: #ddd;
    }
    .systemawriter-container textarea,
    .systemawriter-container input[type="text"] {
        --input-border-color: #ccc;
        --input-bg-color: #fff;
        --text-color: #213547;
    }
    .systemawriter-container button {
        --button-primary-bg: #007bff;
        --button-primary-text: #fff;
    }
    .systemawriter-container button:hover:not(:disabled) {
        --button-primary-hover-bg: #0056b3;
    }
     .systemawriter-container button:disabled {
        --button-disabled-bg: #ccc;
    }
    .generated-content-preview {
        --preview-bg-color: #efefef;
        --preview-border-color: #d0d0d0;
        --preview-heading-color: #0056b3;
    }
    .error-message {
        --error-text-color: #721c24;
        --error-bg-color: #f8d7da;
        --error-border-color: #f5c6cb;
    }
}
```

**Next Steps:**

1.  **API Key:** Ensure your `OPENAI_API_KEY` (or equivalent for your chosen LLM) is correctly set in `repo_src/backend/.env`.
2.  **Install Dependencies:**
    *   Run `pip install openai python-dotenv` in your backend's virtual environment.
    *   Run `pnpm install react-router-dom react-markdown` in the project root (or `repo_src/frontend` if managing separately).
3.  **Testing:**
    *   Start both frontend (`pnpm dev:frontend`) and backend (`pnpm dev:backend`).
    *   Navigate to the `/systemawriter` route in your browser.
    *   Test the flow step-by-step. Debug API calls and prompt responses. Prompt engineering will likely be an iterative process.
4.  **Refinement:**
    *   The scene selection and plan input for narrative generation is very basic in this version. This area will need UI/UX refinement.
    *   Error handling can be made more robust.
    *   Consider adding persistence for generated content if users need to resume sessions (out of scope for this v0.1).

This implementation provides the core multi-step generation and approval workflow for SystemaWriter v0.1.