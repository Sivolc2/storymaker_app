import os
import httpx
import json
from dotenv import load_dotenv

# Load environment variables from .env file which should be in the backend directory
# For production, environment variables should be set through the deployment environment.
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '..', '.env')  # Assumes .env is in backend/

if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    # Fallback if .env is not in backend/ but in project root, though backend/.env is preferred.
    project_root_env = os.path.join(current_dir, '..', '..', '..', '.env')
    if os.path.exists(project_root_env):
        load_dotenv(dotenv_path=project_root_env)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL_NAME = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4")  # Default if not set
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
YOUR_SITE_URL = os.getenv("YOUR_SITE_URL", "http://localhost:5173")  # Optional
YOUR_APP_NAME = os.getenv("YOUR_APP_NAME", "SystemaWriter")  # Optional

if not OPENROUTER_API_KEY:
    print("Warning: OPENROUTER_API_KEY not found. LLM calls will fail.")

async def ask_llm(prompt_text: str, system_message: str = "You are a helpful assistant specializing in creative writing and story structuring.") -> str:
    """
    Sends a prompt to the configured LLM via OpenRouter and returns the response.
    """
    if not OPENROUTER_API_KEY:
        return "Error: OPENROUTER_API_KEY not configured."

    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        
        # Add optional headers recommended by OpenRouter
        if YOUR_SITE_URL:
            headers["HTTP-Referer"] = YOUR_SITE_URL
        if YOUR_APP_NAME:
            headers["X-Title"] = YOUR_APP_NAME
        
        payload = {
            "model": DEFAULT_MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt_text}
            ],
            "temperature": 0.7,
            "max_tokens": 2048,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            response_data = response.json()
            if "choices" in response_data and len(response_data["choices"]) > 0:
                content = response_data["choices"][0]["message"]["content"]
                return content.strip() if content else "Error: No content in LLM response."
            else:
                return "Error: Invalid response format from LLM."
                
    except httpx.HTTPStatusError as e:
        print(f"HTTP error calling OpenRouter API with model {DEFAULT_MODEL_NAME}: {e.response.status_code} - {e.response.text}")
        return f"Error: HTTP {e.response.status_code} from LLM API. Check your API key and model permissions."
    except httpx.TimeoutException:
        print("Timeout error calling OpenRouter API")
        return "Error: Request timed out. The model may be taking too long to respond."
    except Exception as e:
        print(f"Error calling OpenRouter API with model {DEFAULT_MODEL_NAME}: {e}")
        return f"Error: Could not get response from LLM. Details: {str(e)}" 