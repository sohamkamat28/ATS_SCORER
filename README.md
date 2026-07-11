# ATS_SCORER

A web app that scores how well a resume matches a job description and returns actionable feedback. Built with FastAPI + Streamlit, using spaCy and Sentence Transformers for NLP and the Groq API for LLM-generated suggestions.

## What it does

1. Upload a resume (PDF / DOC / DOCX) and paste a job description.
2. The backend parses the resume, extracts skills and experience, and compares them to the JD using semantic similarity.
3. You get an ATS score, a breakdown by category (formatting, keywords, content, skill validation, ATS compatibility), and LLM-written suggestions for what to improve.
4. Past analyses are saved to your account so you can revisit them.

## Tech stack

- **Frontend:** Streamlit
- **Backend:** FastAPI (Python)
- **NLP:** spaCy (`en_core_web_md`), Sentence Transformers (`all-MiniLM-L6-v2`)
- **LLM:** Groq API (Llama 3)
- **Auth + Database:** Supabase (email/password and Google OAuth)
- **PDF report export:** WeasyPrint + Jinja2

## Project structure

```
ATS_SCORER/
├── backend/              FastAPI app, NLP services, API routes
├── frontend/             Streamlit app, views, components
├── jupyter notebooks/    Research and dataset prep (not used at runtime)
├── ml model/             Exported ML artifacts
├── requirements.txt      Combined backend + frontend dependencies
└── .env.example          Template for environment variables
```

## Setup

### 1. Clone and create a virtual environment

```bash
git clone <repo-url>
cd ATS_SCORER
python -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_md
```

WeasyPrint needs system libraries on Linux:

```bash
# Fedora
sudo dnf install -y cairo pango gdk-pixbuf2 libffi

# Debian / Ubuntu
sudo apt install -y libcairo2 libpango-1.0-0 libpangoft2-1.0-0 libffi-dev
```

### 3. Configure environment variables

Copy the template and fill in your keys:

```bash
cp .env.example .env
```

You need:

- A **Supabase** project — grab `SUPABASE_URL`, `SUPABASE_KEY` (service role), and `SUPABASE_ANON_KEY` from Project Settings → API.
- A **Groq** API key from [console.groq.com](https://console.groq.com).
- (Optional) Google OAuth set up in the Supabase dashboard if you want Google sign-in.

The Streamlit frontend also reads Supabase config from `frontend/.streamlit/secrets.toml`. Copy `secrets.toml.example` to `secrets.toml` and fill it in.

### 4. Run the backend

From the project root:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now at `http://localhost:8000`.

### 5. Run the frontend

In a new terminal (with the venv activated):

```bash
streamlit run frontend/streamlit_app.py
```

The app opens at `http://localhost:8501`.

## Notes for students

- **Never commit `.env` or `secrets.toml`** — they hold API keys. Both are in `.gitignore`; check before you push.
- The first run downloads the Sentence Transformer model (~80 MB). It's cached afterwards.
- If you don't have a Groq key yet, the scoring still works — only the LLM suggestions section will be empty.
- `jupyter notebooks/` and `ml model/` are for experimentation and aren't required to run the app.

## Production deployment

The production architecture is intentionally isolated from the original Streamlit app:

- `web/` is the Next.js frontend deployed to Vercel.
- `backend/` is the FastAPI service deployed to Render Free using `render.yaml`.
- Supabase provides authentication and analysis history for both interfaces.
- The original `frontend/` Streamlit app remains available for local use.

### Vercel frontend

Create a Vercel project with `web` as its Root Directory and add:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
```

Set `NEXT_PUBLIC_API_URL` to the public Render service URL without a trailing slash.

### Render backend

Create a Render Blueprint from the repository's `render.yaml`. During initial setup,
provide the prompted secret values and set `FRONTEND_URL` to the Vercel production URL.
The Render-specific dependency file excludes PyTorch and native PDF libraries so the API
remains within free-tier memory and build constraints.

After both services are live, add the Vercel URL to Supabase Authentication's Site URL
and Redirect URLs. Future pushes to `main` update each service independently.
