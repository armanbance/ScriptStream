# ScriptStream — Demo Script

> A walkthrough of how the frontend and backend work together.
> Estimated demo time: **5–7 minutes**

---

## Opening (30 seconds)

ScriptStream is a script-writing tool for video creators. You upload your
previous videos, and the AI learns your voice — how you talk, your slang, your
energy, your structure. Then you type a topic into the chat panel and it
ghostwrites a new script that sounds like *you*, not like a robot.

Two pieces make this work: a **React + Vite frontend** and a
**FastAPI backend** connected by a REST API.

---

## Part 1 — The Frontend (1 minute)

Open the app at `http://localhost:5173`.

The layout has three columns:

| Column | What it does |
|--------|--------------|
| **Sidebar** (left) | Lists your script documents, has an "Upload media" button at the bottom, and a Settings link. |
| **Editor** (center) | A distraction-free textarea where you write and edit scripts. Title bar across the top, word/character count in the status bar. |
| **Chat Panel** (right) | An AI assistant panel. Type a topic or question, hit Enter, and it returns a generated script you can insert directly into the editor. |

**Key frontend details to call out:**

- The app stores a `creatorUsername` in Settings (persisted to localStorage).
  This username ties everything together — uploads and script generation are
  scoped to it.
- The chat panel has quick-suggestion buttons: *"Rewrite my intro to be
  punchier"*, *"Give me 5 B-roll ideas"*, *"Suggest a strong hook"*,
  *"Tighten this script"*.
- Generated scripts have an **Insert** button that appends the AI output
  directly into the editor.

---

## Part 2 — Upload Flow (2 minutes)

**What the user sees:**

1. Click **Upload media** in the sidebar.
2. Pick a video file. A spinner appears while it uploads.
3. A "Uploaded · filename" confirmation appears.

**What happens behind the scenes (backend):**

```
Frontend                         Backend (/api/upload-video)
────────                         ──────────────────────────
FormData { file, creator_username }
         ──── POST ────►
                                 1. Save file to a temp directory
                                 2. media_processor: FFmpeg extracts audio → MP3
                                 3. transcriber: Whisper API transcribes audio
                                    → returns { text, segments }
                                 4. rag_engine.ingest_transcript:
                                    a. Chunk transcript (~150 words each,
                                       2-sentence overlap for continuity)
                                    b. Embed chunks via text-embedding-3-small
                                    c. Upsert vectors + metadata into Pinecone
                                       (index: "scriptstream")
                                 5. voice_profile: Automatically rebuild
                                    a. Pull all of this creator's chunks
                                    b. Send up to 80 chunks to GPT-4o
                                       with a voice-analysis prompt
                                    c. Store the resulting profile as a
                                       single vector in Pinecone
         ◄──── 200 ─────
{ "message": "Video processed and transcript ingested successfully" }
```

The more videos you upload, the richer the voice profile becomes. The system
learns vocabulary, sentence patterns, energy level, structural habits, and
rhetorical style.

---

## Part 3 — Script Generation Flow (2 minutes)

**What the user sees:**

1. Type a topic into the chat panel, e.g. *"How to learn Python"*.
2. A thinking animation plays while the backend works.
3. The AI returns a full script in the creator's voice.
4. Click **Insert** to drop it into the editor. Edit from there.

**What happens behind the scenes (backend):**

```
Frontend                         Backend (/api/generate-script)
────────                         ──────────────────────────────
{ topic, creator_username }
         ──── POST ────►
                                 1. Fetch the creator's stored voice profile
                                    from Pinecone
                                 2. Embed the topic with text-embedding-3-small
                                 3. Query Pinecone for the top 15 transcript
                                    chunks most relevant to this topic
                                 4. Fetch additional "style example" chunks
                                    for few-shot prompting
                                 5. Build a system prompt containing:
                                    • Base instructions (strict ghostwriting
                                      rules — match voice, vocabulary, energy,
                                      structure, rhetorical devices)
                                    • The voice profile
                                    • Style examples
                                    • Relevant reference material (the chunks)
                                 6. Call GPT-4o (chat completion) with:
                                    • system: the assembled prompt
                                    • user: "Write a script about: {topic}"
         ◄──── 200 ─────
{ "script": "What if everything you knew about Python was wrong? ..." }
```

---

## Part 4 — Architecture Summary (30 seconds)

```
┌─────────────────────────────────────────────────────────┐
│                  React + Vite (port 5173)                │
│                                                         │
│  Sidebar ── Editor ── ChatPanel                         │
│  (upload)   (write)   (generate & insert)               │
└──────────────────┬──────────────────────────────────────┘
                   │  REST API (axios → /api/...)
                   ▼
┌─────────────────────────────────────────────────────────┐
│               FastAPI (port 8000)                        │
│                                                         │
│  POST /api/upload-video     POST /api/generate-script   │
│       │                           │                     │
│       ▼                           ▼                     │
│  ┌──────────┐               ┌──────────────┐            │
│  │  FFmpeg   │               │  Voice Profile│           │
│  │  extract  │               │  (fetch)      │           │
│  └────┬─────┘               └──────┬───────┘            │
│       ▼                           │                     │
│  ┌──────────┐                     │                     │
│  │  Whisper  │                     ▼                     │
│  │  (OpenAI) │            ┌───────────────┐             │
│  └────┬─────┘            │  Pinecone RAG  │             │
│       ▼                  │  (embed topic, │             │
│  ┌───────────────┐       │   retrieve     │             │
│  │  RAG Engine   │       │   chunks)      │             │
│  │  (chunk,embed,│       └───────┬───────┘             │
│  │   upsert)     │               ▼                     │
│  └───────┬──────┘       ┌───────────────┐              │
│          ▼              │  GPT-4o       │              │
│  ┌───────────────┐      │  (generate    │              │
│  │ Voice Profile │      │   script)     │              │
│  │ (rebuild)     │      └───────────────┘              │
│  └───────────────┘                                     │
└─────────────────────────────────────────────────────────┘
                   │                │
                   ▼                ▼
          ┌───────────────────────────────┐
          │         Pinecone              │
          │  Index: "scriptstream"        │
          │  • transcript_chunk vectors   │
          │  • voice_profile vectors      │
          └───────────────────────────────┘
```

---

## Closing (30 seconds)

That's the whole loop:

1. **Upload** a video → audio extracted → transcribed → chunked → embedded →
   stored in Pinecone → voice profile rebuilt.
2. **Generate** a script → voice profile loaded → topic embedded → relevant
   chunks retrieved → GPT-4o writes in the creator's voice.
3. **Insert** the result into the editor, tweak it, and you're ready to film.

The creator's voice profile gets better with every upload — more data means
more accurate ghostwriting. No database besides Pinecone; all state lives in
the vector index.
