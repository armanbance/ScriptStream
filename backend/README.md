# ScriptStream Backend

FastAPI server that handles video ingestion, transcription (OpenAI Whisper), RAG-powered context retrieval (Pinecone), and AI script generation.

## Prerequisites

- **Python 3.11+**
- **FFmpeg** — required for extracting audio from uploaded videos
- An **OpenAI API key** (for Whisper transcription and script generation)
- A **Pinecone API key** (for vector storage / RAG retrieval)
- A **Supabase project URL** configured with Auth JWT signing keys

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
SUPABASE_URL=https://your-project-ref.supabase.co

```

### 6. Start the development server

```bash
python main.py
```

The backend server will be available at **http://localhost:8000**.


### Upload Video

```bash
curl -X POST http://localhost:8000/api/upload-video \
  -H "Authorization: Bearer <supabase-access-token>" \
  -F "file=@video.mp4" \
  -F "creator_username=your_username"
```

### Generate Script

```bash
curl -X POST http://localhost:8000/api/generate-script \
  -H "Authorization: Bearer <supabase-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How to learn Python",
    "creator_username": "your_username",
    "length_hint": "5 minutes",
    "temperature": 0.7
  }'
```

