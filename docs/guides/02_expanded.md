 Okay, "Phase 2: Story Structuring & Worldbuilding (AI-Assisted)" involves generating the initial Table of Contents/Chapter Outline and the Worldbuilding Document, with user approval steps. The frontend and backend API endpoints for these are already in place from the previous implementation.

The key refinement for this phase will be to **integrate OpenRouter as the LLM backend**, as per your design requirement. This involves modifying the LLM interface. We will also ensure the prompts for these steps are robust.

Here's how we'll proceed:

1.  **Modify `llm_interface.py` to use OpenRouter:**
    *   Change API key handling from `OPENAI_API_KEY` to `OPENROUTER_API_KEY`.
    *   Update the `ask_llm` function to point to the OpenRouter API endpoint (`https://openrouter.ai/api/v1`) and use OpenRouter-compatible model strings.
    *   Add optional headers recommended by OpenRouter (`HTTP-Referer`, `X-Title`).
    *   Make the LLM model configurable via an environment variable.
2.  **Update Environment Configuration:**
    *   Modify `repo_src/backend/.env.example` to reflect the new `OPENROUTER_API_KEY` and `OPENROUTER_MODEL_NAME`.
3.  **Review and Refine Prompts (Minor):** Briefly check `prompts.py` for the outline and worldbuilding steps to ensure they are comprehensive.
4.  **No Frontend Changes Required for this specific phase update**, as the existing UI flow for generating outlines, worldbuilding, and approving them already supports the "Phase 2" workflow. The change is purely on the backend LLM provider.

Here are the specific file changes:

```diff
--- a/repo_src/backend/.env.example
+++ b/repo_src/backend/.env.example
@@ -1,5 +1,7 @@
 # Backend Environment Variables Example
 DATABASE_URL=sqlite:///./app_dev.db
 PORT=8000
 LOG_LEVEL=info
-OPENAI_API_KEY="your_openai_api_key_here"
+OPENROUTER_API_KEY="your_openrouter_api_key_here" # https://openrouter.ai/keys
+OPENROUTER_MODEL_NAME="openai/gpt-3.5-turbo" # Example: "mistralai/mistral-7b-instruct", "anthropic/claude-3-haiku"
+YOUR_SITE_URL="http://localhost:5173" # Optional: For OpenRouter HTTP-Referer
+YOUR_APP_NAME="SystemaWriter" # Optional: For OpenRouter X-Title
--- a/repo_src/backend/systemawriter_logic/llm_interface.py
+++ b/repo_src/backend/systemawriter_logic/llm_interface.py
@@ -1,6 +1,6 @@
 import os
-import openai
 from dotenv import load_dotenv
+from openai import OpenAI # Uses OpenAI SDK v1.x.x
 
 # Load environment variables from .env file which should be in the backend directory
 # For production, environment variables should be set through the deployment environment.
@@ -14,42 +14,58 @@
     if os.path.exists(project_root_env):
         load_dotenv(dotenv_path=project_root_env)
 
-OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
+OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
+DEFAULT_MODEL_NAME = os.getenv("OPENROUTER_MODEL_NAME", "openai/gpt-3.5-turbo") # Default if not set
+YOUR_SITE_URL = os.getenv("YOUR_SITE_URL", "") # Optional
+YOUR_APP_NAME = os.getenv("YOUR_APP_NAME", "SystemaWriter") # Optional
 
-if not OPENAI_API_KEY:
-    print("Warning: OPENAI_API_KEY not found. LLM calls will fail.")
-else:
-    openai.api_key = OPENAI_API_KEY
+if not OPENROUTER_API_KEY:
+    print("Warning: OPENROUTER_API_KEY not found. LLM calls will fail.")
+
+client = None
+if OPENROUTER_API_KEY:
+    client = OpenAI(
+        base_url="https://openrouter.ai/api/v1",
+        api_key=OPENROUTER_API_KEY,
+    )
 
 async def ask_llm(prompt_text: str, system_message: str = "You are a helpful assistant specializing in creative writing and story structuring.") -> str:
     """
-    Sends a prompt to the OpenAI LLM and returns the response.
+    Sends a prompt to the configured LLM via OpenRouter and returns the response.
     """
-    if not OPENAI_API_KEY:
-        return "Error: OPENAI_API_KEY not configured."
+    if not client:
+        return "Error: OpenRouter client not initialized. Check OPENROUTER_API_KEY."
 
     try:
-        # Using the new OpenAI API structure (v1.0.0+)
-        # For older versions, the API call structure might be different.
-        # Consider making this truly async if FastAPI endpoints are async and LLM client supports it.
-        # For now, using the synchronous client for simplicity in a potentially async FastAPI route.
-        # If openai.ChatCompletion.create is blocking, run it in a thread pool executor for async routes.
-        
-        # This example uses a simplified synchronous call pattern.
-        # For production, you might want to use `openai.AsyncOpenAI` client
-        # and `await client.chat.completions.create(...)`
-        
-        # For simplicity in this example, we'll use a blocking call.
-        # In a real async FastAPI app, you'd use `await asyncio.to_thread(blocking_function)`
-        # or an async OpenAI client.
-        
-        completion = openai.chat.completions.create(
-            model="gpt-3.5-turbo", # Or "gpt-4" or other preferred model
+        extra_headers = {}
+        if YOUR_SITE_URL:
+            extra_headers["HTTP-Referer"] = YOUR_SITE_URL
+        if YOUR_APP_NAME:
+            extra_headers["X-Title"] = YOUR_APP_NAME
+
+        # The OpenAI SDK's client.chat.completions.create is a blocking call.
+        # For truly async behavior in FastAPI, you should run this in a thread pool:
+        # import asyncio
+        # response_content = await asyncio.to_thread(
+        #     client.chat.completions.create,
+        #     model=DEFAULT_MODEL_NAME,
+        #     messages=[...],
+        #     extra_headers=extra_headers if extra_headers else None
+        # )
+        # For now, keeping it as a direct call for simplicity, which means it will block the event loop.
+
+        completion = client.chat.completions.create(
+            model=DEFAULT_MODEL_NAME,
             messages=[
                 {"role": "system", "content": system_message},
                 {"role": "user", "content": prompt_text}
             ],
             temperature=0.7,
             max_tokens=2048, # Adjust as needed
+            extra_headers=extra_headers if extra_headers else None,
         )
         response_content = completion.choices[0].message.content
         return response_content.strip() if response_content else "Error: No content in LLM response."
     except Exception as e:
-        print(f"Error calling OpenAI API: {e}")
+        print(f"Error calling OpenRouter API with model {DEFAULT_MODEL_NAME}: {e}")
         return f"Error: Could not get response from LLM. Details: {str(e)}"
-
--- a/repo_src/backend/systemawriter_logic/prompts.py
+++ b/repo_src/backend/systemawriter_logic/prompts.py
@@ -22,7 +22,7 @@
 """
     prompt += f"""
 Remember to structure the output as a Markdown document.
-For example:
+For a chaptered story, an example structure:
 ## Chapter 1: The Discovery
 - Elara finds the artifact.
 - Village elders are suspicious.
@@ -31,8 +31,10 @@
 - The empire's soldiers arrive.
 - Elara escapes with the help of a mysterious stranger.
 
-Focus on a logical flow and ensure key elements from the concept are addressed.
-If the concept implies a short story, provide 5-7 major plot beats instead of chapters.
+If the concept implies a shorter story (e.g., a single scene or very short narrative), provide 3-5 major plot beats instead of chapters, like:
+## Beat 1: The Setup
+- Brief description of the situation.
+
+Focus on a logical flow and ensure key elements from the concept are addressed. Ensure the output is well-formatted Markdown.
 The user's concept document guidelines were:
 {CONCEPT_DOCUMENT_GUIDE}
 
@@ -44,7 +46,7 @@
     prompt = f"""
 You are a worldbuilding assistant. Based on the provided story concept and the approved story outline, expand on the worldbuilding details.
 Generate a Markdown document with the following sections:
-### Main Characters
+## Main Characters
 - For each main character hinted at in the concept or outline:
   - Name (suggest if not provided)
   - Brief Description (appearance, core personality traits)
@@ -52,14 +54,14 @@
   - Motivations
   - Potential Arc (how they might change or what they might achieve based on the outline)
 
-### Setting Details
+## Setting Details
 - Key Locations mentioned or implied by the outline.
 - Time Period/Technology Level (e.g., medieval, futuristic).
 - Culture Snippets (e.g., societal norms, beliefs if hinted).
 - Magic System/Unique World Rules (if applicable, explain briefly how it works or its impact).
 
-### Other Key Elements (Optional)
-- Factions, organizations, or groups.
+## Other Key Elements (If Applicable)
+- Important Factions/Organizations.
 - Important items or artifacts.
 
 **Story Concept:**
```

**Explanation of Changes:**

1.  **`repo_src/backend/.env.example`:**
    *   Changed `OPENAI_API_KEY` to `OPENROUTER_API_KEY`.
    *   Added `OPENROUTER_MODEL_NAME` to allow easy configuration of the model used via OpenRouter (e.g., `mistralai/mistral-7b-instruct`, `anthropic/claude-3-haiku`, `openai/gpt-4`, etc.).
    *   Added `YOUR_SITE_URL` and `YOUR_APP_NAME` as optional environment variables for OpenRouter's recommended headers.

2.  **`repo_src/backend/systemawriter_logic/llm_interface.py`:**
    *   Imports `OpenAI` from the `openai` SDK (which can be used for any OpenAI-compatible API).
    *   Reads `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_NAME`, `YOUR_SITE_URL`, and `YOUR_APP_NAME` from environment variables.
    *   Initializes the `OpenAI` client with `base_url="https://openrouter.ai/api/v1"` and the `OPENROUTER_API_KEY`.
    *   The `ask_llm` function now uses this `client` to make requests.
    *   It passes the `OPENROUTER_MODEL_NAME` to the `model` parameter.
    *   It constructs `extra_headers` for `HTTP-Referer` and `X-Title` if the corresponding environment variables are set.
    *   **Important Note on Asynchronicity:** The `client.chat.completions.create` call is synchronous. In a truly asynchronous FastAPI application, you'd typically run blocking I/O operations like this in a separate thread pool (e.g., using `await asyncio.to_thread(...)`) to avoid blocking the main event loop. For simplicity in this iteration, it's left as a direct call. If performance becomes an issue under load, this should be refactored.

3.  **`repo_src/backend/systemawriter_logic/prompts.py`:**
    *   Minor clarification in `get_outline_prompt` to suggest different H2 heading structures for chaptered stories vs. shorter beat-based stories.
    *   Changed `###` subheadings in `get_worldbuilding_prompt` to `##` for better top-level Markdown structure in the generated document (consistency).

**To Use These Changes:**

1.  **Update your `.env` file:** In `repo_src/backend/.env`, change `OPENAI_API_KEY` to `OPENROUTER_API_KEY` and set its value to your actual OpenRouter key. Also, set `OPENROUTER_MODEL_NAME` to your desired model (e.g., `openai/gpt-3.5-turbo`, `anthropic/claude-3-haiku-20240307`, `mistralai/mistral-7b-instruct`). You can also set `YOUR_SITE_URL` and `YOUR_APP_NAME`.
2.  **Restart Backend:** If your backend server is running, restart it to pick up the environment variable changes and code modifications.

The application will now use OpenRouter for generating the story outlines and worldbuilding documents as part of Phase 2. The frontend workflow for these steps remains the same, as the API contract hasn't changed.