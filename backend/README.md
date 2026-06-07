# ATS Resume Optimizer — Backend

Async FastAPI backend for the ATS Resume Optimizer frontend.

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn (ASGI) |
| Extraction | pdfplumber · python-docx · pytesseract |
| Config | pydantic-settings |
| Logging | structlog (pretty dev / JSON prod) |
| Tests | pytest + pytest-asyncio + httpx |

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/Mac

# 4. Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server runs at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

## Tesseract OCR (for image uploads)

Image OCR requires the Tesseract binary installed on the host:

- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki  
  Then set `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe` in `.env`
- **Linux**: `sudo apt install tesseract-ocr`
- **macOS**: `brew install tesseract`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/resume/upload` | Upload resume + JD, start job |
| `GET` | `/api/v1/resume/status/{job_id}` | Poll job status |
| `GET` | `/docs` | Swagger UI |

### Upload Request (multipart/form-data)

| Field | Type | Required | Description |
|---|---|---|---|
| `resume_file` | File | ✅ | PDF, DOCX, PNG, or JPG |
| `job_description` | string | ⚠️ | Raw JD text (required if no `jd_file`) |
| `jd_file` | File | ⚠️ | JD as PDF/image (required if no `job_description`) |

### Status Response

```json
{
  "job_id": "uuid",
  "status": "processing | complete | failed",
  "progress": 80,
  "result": { ... },
  "error": null
}
```

## Running Tests

```bash
pytest tests/ -v
```

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # App factory, CORS, lifespan
│   ├── config.py                  # Typed settings (pydantic-settings)
│   ├── logging_config.py          # Structlog setup
│   ├── exceptions.py              # Custom exceptions + handlers
│   ├── dependencies.py            # FastAPI Depends() factories
│   ├── api/v1/
│   │   ├── router.py
│   │   └── endpoints/
│   │       ├── health.py
│   │       └── resume.py
│   ├── core/extraction/
│   │   ├── base.py
│   │   ├── normalizer.py          # 9-step text normalization pipeline
│   │   ├── pdf_extractor.py       # pdfplumber (layout-aware)
│   │   ├── docx_extractor.py      # python-docx (document-order traversal)
│   │   └── image_extractor.py     # pytesseract OCR
│   ├── models/
│   │   ├── requests.py
│   │   └── responses.py
│   └── services/
│       ├── job_store.py           # Async in-memory job state
│       └── extraction_service.py  # Orchestrator + MIME routing
└── tests/
    ├── conftest.py
    ├── test_extraction.py
    └── test_resume_endpoints.py
```
