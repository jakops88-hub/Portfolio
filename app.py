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
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
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

# Validate required environment variables
if not GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY not set. Chat functionality will be limited.")

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

# Portfolio owner username - hardcoded for security to prevent fetching other users' data
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
6. Do not hallucinate URLs or information; use provided data or acknowledge limitations."""


# Pydantic models
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    response: str
    function_calls: Optional[List[Dict[str, Any]]] = None


# Tool/Function definitions for Gemini
def get_pinned_repos() -> List[Dict[str, Any]]:
    """
    Fetches pinned repositories from GitHub GraphQL API for the portfolio owner.
    Username is fixed to PORTFOLIO_USERNAME for security.
    
    Returns:
        List of pinned repositories with name, description, url, stars, and language
    """
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
        
        if "errors" in data:
            logger.error(f"GitHub GraphQL errors: {data['errors']}")
            return []
        
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
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch pinned repos: {e}")
        return []


def get_career_history() -> List[Dict[str, str]]:
    """
    Returns Jacob's career history and milestones.
    
    Returns:
        List of career milestones with role, company, period, and description
    """
    return CAREER_HISTORY


# Define tools for Gemini function calling
tools = [
    {
        "name": "get_pinned_repos",
        "description": "Fetches the pinned GitHub repositories for jakops88-hub. Returns name, description, URL, star count, and primary language for each repo. Call this when user asks about projects or GitHub.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_career_history",
        "description": "Returns Jacob's career history including roles, companies, periods, and descriptions. Call this when user asks about experience, resume, career, or background.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    }
]


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "gemini_configured": bool(GOOGLE_API_KEY),
        "github_configured": bool(GITHUB_TOKEN)
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint that handles conversations with Gemini AI.
    Supports function calling for fetching GitHub repos and career history.
    """
    if not GOOGLE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY not configured"
        )
    
    try:
        # Initialize the model with function calling
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash-latest",
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[
                genai.protos.Tool(
                    function_declarations=[
                        genai.protos.FunctionDeclaration(
                            name="get_pinned_repos",
                            description="Fetches the pinned GitHub repositories for jakops88-hub. Returns name, description, URL, star count, and primary language for each repo.",
                            parameters=genai.protos.Schema(
                                type=genai.protos.Type.OBJECT,
                                properties={}
                            )
                        ),
                        genai.protos.FunctionDeclaration(
                            name="get_career_history",
                            description="Returns Jacob's career history including roles, companies, periods, and descriptions.",
                            parameters=genai.protos.Schema(
                                type=genai.protos.Type.OBJECT,
                                properties={}
                            )
                        )
                    ]
                )
            ]
        )
        
        # Start a chat session
        chat_session = model.start_chat(history=[])
        
        # Send the user message
        response = chat_session.send_message(request.message)
        
        # Check if there are function calls
        function_calls = []
        final_response = ""
        
        # Handle function calling
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                # Check if this part is a function call
                if hasattr(part, 'function_call') and part.function_call:
                    func_call = part.function_call
                    func_name = func_call.name
                    func_args = dict(func_call.args) if func_call.args else {}
                    
                    logger.info(f"Function call detected: {func_name} with args {func_args}")
                    
                    # Execute the function
                    if func_name == "get_pinned_repos":
                        result = get_pinned_repos()
                    elif func_name == "get_career_history":
                        result = get_career_history()
                    else:
                        result = {"error": f"Unknown function: {func_name}"}
                    
                    function_calls.append({
                        "name": func_name,
                        "arguments": func_args,
                        "result": result
                    })
                    
                    # Send the function result back to the model
                    function_response = genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=func_name,
                            response={"result": result}
                        )
                    )
                    
                    # Get the final response with function results
                    final_response_obj = chat_session.send_message(function_response)
                    final_response = final_response_obj.text
                
                elif hasattr(part, 'text') and part.text:
                    final_response = part.text
        
        # If no text response yet, try to get it
        if not final_response:
            final_response = response.text if hasattr(response, 'text') else "I apologize, but I couldn't generate a response."
        
        return ChatResponse(
            response=final_response,
            function_calls=function_calls if function_calls else None
        )
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat request: {str(e)}"
        )


# Static file serving for the frontend
# The Vite build outputs to the 'dist' directory
DIST_DIR = Path(__file__).parent / "dist"

if DIST_DIR.exists():
    # Mount static files (js, css, assets)
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Serve the frontend application.
        Returns index.html for all non-API routes to support client-side routing.
        """
        # Don't serve index.html for API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Try to serve the specific file if it exists
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # Otherwise serve index.html for client-side routing
        index_path = DIST_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        raise HTTPException(status_code=404, detail="Frontend not built")
else:
    logger.warning(f"Frontend dist directory not found at {DIST_DIR}")
    
    @app.get("/")
    async def root():
        return {
            "message": "Digital Twin Portfolio API",
            "status": "Frontend not built. Run 'npm run build' first.",
            "api_docs": "/docs"
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
