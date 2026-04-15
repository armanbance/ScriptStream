# ScriptStream Backend

FastAPI server that handles video ingestion, transcription (OpenAI Whisper), RAG-powered context retrieval (Pinecone), and AI script generation.

## Prerequisites

- **Python 3.11+**
- **FFmpeg** — required for extracting audio from uploaded videos
- An **OpenAI API key** (for Whisper transcription and script generation)
- A **Pinecone API key** (for vector storage / RAG retrieval)

### Installing FFmpeg

| OS | Command |
|----|---------|
| macOS | `brew install ffmpeg` |
| Ubuntu / Debian | `sudo apt update && sudo apt install ffmpeg` |
| Windows | Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH |

## Setup

### 1. Navigate to the backend directory

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
```

### 3. Activate the virtual environment

**macOS / Linux:**

```bash
source venv/bin/activate
```

**Windows (PowerShell):**

```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
.\venv\Scripts\activate.bat
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure environment variables

Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Open `.env` and set the required values:

```env
# Required
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...

# Optional — defaults shown
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GENERATION_MODEL=gpt-4o
```

### 6. Start the development server

```bash
python main.py
```

The API will be available at **http://localhost:8000**. The server runs with hot-reload enabled, so code changes are picked up automatically.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/` | Service info |
| `POST` | `/api/upload-video` | Upload a video file for transcription and RAG ingestion |
| `POST` | `/api/generate-script` | Generate a script for a given topic and creator |

### Upload Video

```bash
curl -X POST http://localhost:8000/api/upload-video \
  -F "file=@video.mp4" \
  -F "creator_username=your_username"
```

### Generate Script

```bash
curl -X POST http://localhost:8000/api/generate-script \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How to learn Python",
    "creator_username": "your_username",
    "length_hint": "5 minutes",
    "temperature": 0.7
  }'
```

## Project Structure

```
backend/
├── main.py                  # App entrypoint & CORS config
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variable template
├── api/
│   └── routes.py            # API route definitions
└── services/
    ├── media_processor.py   # FFmpeg audio extraction
    ├── transcriber.py       # OpenAI Whisper transcription
    ├── rag_engine.py        # Pinecone vector ingestion & retrieval
    ├── script_generator.py  # AI script generation
    └── voice_profile.py     # Creator voice profile analysis
```
