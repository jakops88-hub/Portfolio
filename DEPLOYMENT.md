# Digital Twin Portfolio - Backend & Deployment Guide

## Overview

This project combines a React/Vite frontend with a Python FastAPI backend in a monolithic container architecture, designed for deployment on Google Cloud Run.

## Architecture

- **Frontend**: React application built with Vite, served as static files
- **Backend**: FastAPI (Python) handling API requests and serving frontend
- **AI Integration**: Google Gemini 1.5 Flash with function calling
- **GitHub Integration**: GraphQL API for fetching pinned repositories
- **Deployment**: Docker container on Google Cloud Run

## Prerequisites

- Python 3.10+
- Node.js 20.x and npm
- Docker (for containerized deployment)
- Google Cloud SDK (for Cloud Run deployment)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Required for Backend
GOOGLE_API_KEY=your_google_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here

# Optional
DATABASE_URL=your_database_url_here  # For future database integration
PORT=8080  # Default port for the server
```

**Important:** The frontend no longer requires any API keys. It calls the Python backend at `/api/chat`, which securely handles all Gemini API interactions.

### Getting API Keys

1. **Google API Key (Gemini)**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **GitHub Token**: Create a personal access token at [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens) with `read:user` and `repo` scopes

## Local Development

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
GOOGLE_API_KEY=your_google_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
```

### 3. Run Development Mode (Frontend + Backend)

**Option A: Run both simultaneously (recommended)**

Terminal 1 - Start the backend:
```bash
python app.py
# Or use uvicorn with auto-reload:
# uvicorn app:app --reload --host 0.0.0.0 --port 8080
```

Terminal 2 - Start the frontend dev server:
```bash
npm run dev
```

The frontend dev server (port 3000) will proxy API requests to the backend (port 8080).

**Option B: Run production build**

```bash
# Build the frontend first
npm run build

# Then start the backend (which serves the built frontend)
python app.py
```

The server will be available at `http://localhost:8080`

- Frontend: `http://localhost:8080/`
- API Health Check: `http://localhost:8080/api/health`
- API Documentation: `http://localhost:8080/docs`
- Chat API: `http://localhost:8080/api/chat`

## Docker Deployment

### Build the Docker Image

```bash
docker build -t portfolio-backend .
```

### Run the Docker Container Locally

```bash
docker run -p 8080:8080 \
  -e GOOGLE_API_KEY=your_api_key \
  -e GITHUB_TOKEN=your_github_token \
  portfolio-backend
```

Visit `http://localhost:8080` to see your application.

## Google Cloud Run Deployment

### 1. Configure Google Cloud Project

```bash
# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Build and Deploy

```bash
# Build and submit to Cloud Run in one command
gcloud run deploy portfolio-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_api_key,GITHUB_TOKEN=your_github_token
```

Or build with Cloud Build first:

```bash
# Build the image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/portfolio-backend

# Deploy to Cloud Run
gcloud run deploy portfolio-backend \
  --image gcr.io/YOUR_PROJECT_ID/portfolio-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_api_key,GITHUB_TOKEN=your_github_token
```

### 3. Using Secret Manager (Recommended for Production)

```bash
# Create secrets
echo -n "your_google_api_key" | gcloud secrets create google-api-key --data-file=-
echo -n "your_github_token" | gcloud secrets create github-token --data-file=-

# Deploy with secrets
gcloud run deploy portfolio-backend \
  --image gcr.io/YOUR_PROJECT_ID/portfolio-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --update-secrets GOOGLE_API_KEY=google-api-key:latest,GITHUB_TOKEN=github-token:latest
```

## API Endpoints

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "gemini_configured": true,
  "github_configured": true
}
```

### `POST /api/chat`

Chat with the Digital Twin AI.

**Request:**
```json
{
  "message": "Tell me about your projects",
  "history": []
}
```

**Response:**
```json
{
  "response": "Here are my key projects...",
  "function_calls": [
    {
      "name": "get_pinned_repos",
      "arguments": {"username": "jakops88-hub"},
      "result": [...]
    }
  ]
}
```

## Function Calling / Tools

The Gemini model has access to two functions:

### `get_pinned_repos(username="jakops88-hub")`

Fetches pinned GitHub repositories. Returns:
- name
- description  
- url
- stargazerCount
- language (primary language)

### `get_career_history()`

Returns Jacob's career milestones with:
- role
- company
- period
- description

## Project Structure

```
.
├── app.py                 # FastAPI backend application
├── requirements.txt       # Python dependencies
├── package.json          # Node.js dependencies
├── Dockerfile            # Container configuration
├── .dockerignore         # Files to exclude from Docker build
├── index.html            # Main HTML file (Vite entry)
├── index.tsx             # React entry point
├── App.tsx               # Main React component
├── components/           # React components
├── services/             # Service modules
├── types.ts              # TypeScript type definitions
├── constants.ts          # Application constants
└── dist/                 # Built frontend (generated)
```

## Troubleshooting

### Frontend not loading

1. Ensure you've run `npm run build` before starting the server
2. Check that the `dist/` directory exists and contains `index.html` and `assets/`

### API Key errors

1. Verify the `GOOGLE_API_KEY` environment variable is set in Cloud Run
2. Check API key validity on Google AI Studio
3. For GitHub, ensure token has correct scopes (`read:user` and `repo`)
4. The frontend does not need any API keys - it calls the backend at `/api/chat`

### Docker build fails

1. Ensure all dependencies are listed in `package.json` and `requirements.txt`
2. Check Docker daemon is running
3. Try cleaning Docker cache: `docker system prune`

### CORS issues in development

The FastAPI app includes CORS middleware that allows all origins in development. For production, update the `allow_origins` list in `app.py`.

## Security Notes

1. **Never commit** `.env` files or expose API keys in code
2. Use Google Cloud Secret Manager for production deployments
3. The GitHub token should have minimal required scopes
4. Consider implementing rate limiting for production

## Performance Optimization

For production deployments:

1. **Enable Gemini caching** if making repeated similar requests
2. **Use CDN** for static assets if needed
3. **Configure Cloud Run** with appropriate CPU/memory allocations
4. **Set up monitoring** with Google Cloud Monitoring

## License

This project is part of Jacob Sandström's portfolio.
