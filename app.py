import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Digital Twin Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# --- DYNAMISK MODELL-VÄLJARE (LÖSNINGEN) ---
def get_best_model_name():
    """Hittar en fungerande modell automatiskt istället för att gissa."""
    if not GOOGLE_API_KEY:
        return "gemini-1.5-flash"
    try:
        logger.info("Listing available Gemini models...")
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                # Ta bort 'models/' prefixet om det finns, för säkerhets skull
                clean_name = m.name.replace("models/", "")
                available_models.append(clean_name)
        
        logger.info(f"Found models: {available_models}")

        # Prioriteringslista
        priorities = [
            "gemini-1.5-flash", 
            "gemini-1.5-flash-001", 
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro"
        ]

        # 1. Försök hitta en exakt matchning från vår önskelista
        for p in priorities:
            if p in available_models:
                logger.info(f"Selected priority model: {p}")
                return p

        # 2. Om ingen exakt matchning, ta första bästa som innehåller 'flash'
        for m in available_models:
            if "flash" in m:
                logger.info(f"Selected fallback flash model: {m}")
                return m

        # 3. Nödlösning: Ta första tillgängliga modellen
        if available_models:
            logger.info(f"Selected fallback generic model: {available_models[0]}")
            return available_models[0]
            
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
    
    # Om allt skiter sig, gissa på standard
    return "gemini-1.5-flash"

# Välj modell vid start
CURRENT_MODEL_NAME = get_best_model_name()
logger.info(f"🚀 SYSTEM STARTUP: Using model '{CURRENT_MODEL_NAME}'")


PORTFOLIO_USERNAME = "jakops88-hub"
SYSTEM_INSTRUCTION = """You are Jacob's Digital Twin. You are pragmatic, professional, and an expert in 'The Boring Stack'.

Context:
- Name: Jacob Sandström
- Role: Senior Full-Stack Engineer
- Philosophy: "Technology is a delivery mechanism for value."

UI RENDERING CAPABILITIES (CRITICAL):
You have access to a "Holographic UI" on the frontend.
1. When discussing the project "MemVault", YOU MUST append `[SHOW_PROJECT: memvault]` to your response.
2. When discussing "ContextDiff", append `[SHOW_PROJECT: contextdiff]`.
3. When discussing "Dev-Brain Dump", append `[SHOW_PROJECT: dev-brain]`.
4. When discussing "Lootsy", append `[SHOW_PROJECT: lootsy]`.
5. When asked about career/experience/resume, append `[SHOW_HISTORY]`.

INSTRUCTIONS:
1. Act as Jacob. Be concise.
2. If the user asks "Show me your projects", give a very short summary and trigger the UI tags for the projects.
3. Do NOT output markdown links for these specific projects, use the UI tags instead.
4. For other random GitHub repos, just list them as text.
5. Keep answers concise."""

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    function_calls: Optional[List[Dict[str, Any]]] = None

# --- TOOLS ---
def get_pinned_repos() -> List[Dict[str, Any]]:
    if not GITHUB_TOKEN: return []
    try:
        graphql_url = "https://api.github.com/graphql"
        query = """query($username: String!) { user(login: $username) { pinnedItems(first: 10, types: REPOSITORY) { nodes { ... on Repository { name description url stargazerCount primaryLanguage { name } } } } } }"""
        response = requests.post(graphql_url, json={"query": query, "variables": {"username": PORTFOLIO_USERNAME}}, headers={"Authorization": f"Bearer {GITHUB_TOKEN}"}, timeout=10)
        nodes = response.json().get("data", {}).get("user", {}).get("pinnedItems", {}).get("nodes", [])
        return [{"name": n.get("name"), "description": n.get("description"), "url": n.get("url"), "stargazerCount": n.get("stargazerCount"), "language": n.get("primaryLanguage", {}).get("name", "N/A")} for n in nodes]
    except Exception: return []

def get_career_history() -> List[Dict[str, str]]:
    return [{"role": "Senior Full-Stack Engineer", "company": "TechGiant Nordic", "period": "2021 - Present", "description": "Leading local-first architecture."}, {"role": "Backend Developer", "company": "FinServe AB", "period": "2018 - 2021", "description": "Secure payment gateways."}]

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "model": CURRENT_MODEL_NAME}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not GOOGLE_API_KEY: raise HTTPException(status_code=500, detail="API Key missing")
    try:
        # Använd den automatiskt valda modellen
        model = genai.GenerativeModel(
            model_name=CURRENT_MODEL_NAME,
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[genai.protos.Tool(function_declarations=[
                genai.protos.FunctionDeclaration(name="get_pinned_repos", description="Fetches pinned repos.", parameters=genai.protos.Schema(type=genai.protos.Type.OBJECT, properties={})),
                genai.protos.FunctionDeclaration(name="get_career_history", description="Returns career history.", parameters=genai.protos.Schema(type=genai.protos.Type.OBJECT, properties={}))
            ])]
        )
        
        gemini_history = []
        for msg in request.history:
            if msg.get("content"): gemini_history.append({"role": msg.get("role"), "parts": [msg.get("content")]})

        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(request.message)
        
        function_calls = []
        final_text = ""
        
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    func_name = part.function_call.name
                    result = get_pinned_repos() if func_name == "get_pinned_repos" else get_career_history()
                    function_calls.append({"name": func_name, "result": result})
                    final_resp = chat_session.send_message(genai.protos.Part(function_response=genai.protos.FunctionResponse(name=func_name, response={"result": result})))
                    final_text = final_resp.text
                elif hasattr(part, 'text') and part.text:
                    final_text = part.text
        
        return ChatResponse(response=final_text or "...", function_calls=function_calls)

    except Exception as e:
        logger.error(f"Chat Error: {e}", exc_info=True)
        # Returnera ett 500-fel men med info om vilken modell vi försökte använda
        raise HTTPException(status_code=500, detail=f"Error using model {CURRENT_MODEL_NAME}: {str(e)}")

DIST_DIR = Path(__file__).parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"): raise HTTPException(status_code=404, detail="Not found")
        file_path = DIST_DIR / full_path
        return FileResponse(file_path) if file_path.is_file() else FileResponse(DIST_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
