# Multi-stage Dockerfile for Digital Twin Portfolio
# Stage 1: Base image with Python 3.10
FROM python:3.10-slim as base

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node --version && npm --version && python --version

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install Node.js dependencies
RUN npm install

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY . .

# Build the frontend (Vite builds to 'dist' directory)
RUN npm run build

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/api/health')" || exit 1

# Start the FastAPI server with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
