"""
FastAPI Backend for Digital Twin Portfolio
Handles Gemini AI chat, GitHub integration, and serves static frontend files
"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException, Request
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

# Initialize FastAPI app
app = FastAPI(title="Digital Twin Portfolio API")

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")

# Initialize Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Constants for career history
CAREER_HISTORY = [
    {
        "role": "Senior Full-Stack Engineer",
        "company": "TechGiant Nordic",
        "period": "2021 - Present",
        "description": "Leading the transition to local-first architecture. Improved system resilience by 40%."
    },
    {
        "role": "Backend Developer",
        "company": "FinServe AB",
        "period": "2018 - 2021",
        "description": "Architected secure payment gateways handling $50M+ annual volume."
    },
    {
        "role": "Junior Developer",
        "company": "WebSolutions",
        "period": "2016 - 2018",
        "description": "Full-stack development using React and Node.js."
    }
]

# Portfolio owner username
PORTFOLIO_USERNAME = "jakops88-hub"

# System instruction for Gemini
SYSTEM_INSTRUCTION = """You are Jacob's Digital Twin. You are pragmatic, professional, and an expert in 'The Boring Stack' (Postgres, Docker, Python). 

Context:
- Name: Jacob Sandström
- Role: Senior Full-Stack Engineer & AI Architect
- Philosophy: Technology is a delivery mechanism for value. Simplicity scales better than complexity.
- Specializes in Local-First architecture and deterministic AI

INSTRUCTIONS:
1. Act as Jacob. Be professional but opinionated about simplicity.
2. Only show projects if explicitly asked about projects or GitHub repositories.
3. If asked for resume, career history, or background, you can call get_career_history().
4. If asked about projects or GitHub repos, you can call get_pinned_repos().
5. Keep answers concise and high-value.
6. Do not hallucinate URLs; use provided data or acknowledge limitations."""


# Pydantic models
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    response: str
    function_calls: Optional[List[Dict[str, Any]]] = None


# Tool/Function definitions for Gemini
def get_pinned_repos() -> List[Dict[str, Any]]:
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set. Cannot fetch pinned repos.")
        return []
    
    graphql_url = "https://api.github.com/graphql"
    query = """
    query($username: String!) {
      user(login: $username) {
        pinnedItems(first: 10, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              stargazerCount
              primaryLanguage {
                name
              }
            }
          }
        }
      }
    }
    """
    
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "variables": {"username": PORTFOLIO_USERNAME}
    }
    
    try:
        response = requests.post(graphql_url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        nodes = data.get("data", {}).get("user", {}).get("pinnedItems", {}).get("nodes", [])
        
        repos = []
        for node in nodes:
            repos.append({
                "name": node.get("name", ""),
                "description": node.get("description", "No description"),
                "url": node.get("url", ""),
                "stargazerCount": node.get("stargazerCount", 0),
                "language": node.get("primaryLanguage", {}).get("name", "N/A") if node.get("primaryLanguage") else "N/A"
            })
        return repos
    
    except Exception as e:
        logger.error(f"Failed to fetch pinned repos: {e}")
        return []


def get_career_history() -> List[Dict[str, str]]:
    return CAREER_HISTORY


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_configured": bool(GOOGLE_API_KEY),
        "github_configured": bool(GITHUB_TOKEN)
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    
    try:
        # FIX 1: Använd exakt versionsnamn för att undvika 404
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash-001",
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[
                genai.protos.Tool(
                    function_declarations=[
                        genai.protos.FunctionDeclaration(
                            name="get_pinned_repos",
                            description="Fetches pinned GitHub repos for jakops88-hub.",
                            parameters=genai.protos.Schema(type=genai.protos.Type.OBJECT, properties={})
                        ),
                        genai.protos.FunctionDeclaration(
                            name="get_career_history",
                            description="Returns Jacob's career history.",
                            parameters=genai.protos.Schema(type=genai.protos.Type.OBJECT, properties={})
                        )
                    ]
                )
            ]
        )
        
        # FIX 2: Konvertera historik från Frontend till Gemini-format
        gemini_history = []
        for msg in request.history:
            role = "user" if msg["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [msg["content"]]})

        # Starta chatten MED historik
        chat_session = model.start_chat(history=gemini_history)
        
        # Skicka meddelande
        response = chat_session.send_message(request.message)
        
        # Hantera funktionsanrop
        function_calls = []
        final_response = ""
        
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') andZC(part.function_call): # Check existence
                    func_call = part.function_call
                    func_name = func_call.name
                    logger.info(f"Calling tool: {func_name}")
                    
                    if func_name == "get_pinned_repos":
                        result = get_pinned_repos()
                    elif func_name == "get_career_history":
                        result = get_career_history()
                    else:
                        result = {"error": "Unknown function"}
                    
                    function_calls.append({
                        "name": func_name,
                        "arguments": {},
                        "result": result
                    })
                    
                    # Skicka tillbaka resultatet till modellen
                    function_response = genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=func_name,
                            response={"result": result}
                        )
                    )
                    final_response_obj = chat_session.send_message(function_response)
                    final_response = final_response_obj.text
                
                elif hasattr(part, 'text') and part.text:
                    final_response = part.text
        
        if not final_response:
            final_response = response.text if hasattr(response, 'text') else "..."
        
        return ChatResponse(response=final_response, function_calls=function_calls)
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        # DEBUG: Om modellen inte hittas, logga vilka som finns
        try:
            available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            logger.info(f"Available models: {available}")
        except:
            pass
            
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# Serve Static Files
DIST_DIR = Path(__file__).parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {"status": "Frontend not built. Check logs."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
