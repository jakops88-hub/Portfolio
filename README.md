<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This is a Digital Twin Portfolio combining React frontend with Python FastAPI backend.

## Run Locally

**Prerequisites:** Node.js and Python 3.10+

1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. Set environment variables:
   Create a `.env` file with:
   ```bash
   GOOGLE_API_KEY=your_google_gemini_api_key_here
   GITHUB_TOKEN=your_github_personal_access_token_here
   ```

3. Run the app:
   ```bash
   # Option A: Development mode (frontend dev server + backend)
   # Terminal 1:
   python app.py
   # Terminal 2:
   npm run dev
   # Visit http://localhost:3000

   # Option B: Production mode (built frontend served by backend)
   npm run build
   python app.py
   # Visit http://localhost:8080
   ```

## Deploy to Cloud Run

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

**Required Cloud Run Environment Variable:**
- `GOOGLE_API_KEY` - Your Google Gemini API key
