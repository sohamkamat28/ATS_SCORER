import logging
import httpx
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict
from uuid import uuid4

logger = logging.getLogger('ats_resume_scorer')

from backend.core.config import SUPABASE_URL, SUPABASE_KEY

LOCAL_HISTORY_PATH = Path(__file__).resolve().parents[1] / "data" / "local_history.json"

def _get_headers():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


def _json_default(o):
    if hasattr(o, 'model_dump'):
        return o.model_dump()
    return str(o)


def _load_local_history() -> List[Dict]:
    if not LOCAL_HISTORY_PATH.exists():
        return []
    try:
        return json.loads(LOCAL_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning(f"Local history read failed: {exc}")
        return []


def _write_local_history(docs: List[Dict]) -> None:
    LOCAL_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_HISTORY_PATH.write_text(json.dumps(docs, indent=2), encoding="utf-8")


def _save_local_analysis(user_id: str, filename: str, analysis_result: Dict) -> str:
    serializable_result = json.loads(json.dumps(analysis_result, default=_json_default))
    doc = {
        "id": str(uuid4()),
        "user_id": user_id,
        "filename": filename,
        "ats_score": serializable_result.get("ats_score", 0),
        "keyword_match": serializable_result.get("keyword_match", 0),
        "missing_keywords": serializable_result.get("missing_keywords", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis_result": serializable_result,
    }
    docs = _load_local_history()
    docs.insert(0, doc)
    _write_local_history(docs)
    logger.info(f"Saved analysis to local fallback for user {user_id}: {doc['id']}")
    return doc["id"]


def _format_history_docs(docs: List[Dict]) -> List[Dict]:
    results = []
    for doc in docs:
        results.append({
            "id": str(doc.get("id")),
            "filename": doc.get("filename", "resume"),
            "resume_name": doc.get("filename", "resume"),
            "job_title": "Software Engineer",
            "ats_score": doc.get("ats_score", 0),
            "keyword_match": doc.get("keyword_match", 0),
            "missing_keywords": doc.get("missing_keywords", []),
            "date": doc.get("created_at", ""),
            "created_at": doc.get("created_at", ""),
            "analysis_result": doc.get("analysis_result", {}),
        })
    return results

async def save_analysis(user_id: str, filename: str, analysis_result: Dict) -> Optional[str]:
    headers = _get_headers()
    if not headers:
        return _save_local_analysis(user_id, filename, analysis_result)

    serializable_result = json.loads(json.dumps(analysis_result, default=_json_default))

    doc = {
        "user_id": user_id,
        "filename": filename,
        "ats_score": serializable_result.get("ats_score", 0),
        "keyword_match": serializable_result.get("keyword_match", 0),
        "missing_keywords": serializable_result.get("missing_keywords", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analysis_result": serializable_result,
    }

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=doc)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                inserted_id = str(data[0].get("id"))
                logger.info(f"Saved analysis for user {user_id}: {inserted_id}")
                return inserted_id
            return None
    except Exception as exc:
        logger.error(f"Failed to save analysis to Supabase, using local fallback: {exc}")
        return _save_local_analysis(user_id, filename, analysis_result)

async def get_user_history(user_id: str) -> List[Dict]:
    headers = _get_headers()
    if not headers:
        docs = [doc for doc in _load_local_history() if str(doc.get("user_id")) == str(user_id)]
        return _format_history_docs(docs)

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, 
                headers=headers, 
                params={
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.desc"
                }
            )
            response.raise_for_status()
            docs = response.json()
            
            remote_results = _format_history_docs(docs)
            local_docs = [
                doc for doc in _load_local_history()
                if str(doc.get("user_id")) == str(user_id)
            ]
            return remote_results + _format_history_docs(local_docs)
    except Exception as exc:
        logger.error(f"Failed to fetch history from Supabase, using local fallback: {exc}")
        docs = [doc for doc in _load_local_history() if str(doc.get("user_id")) == str(user_id)]
        return _format_history_docs(docs)

async def delete_analysis(analysis_id: str, user_id: str) -> bool:
    headers = _get_headers()
    if not headers:
        docs = _load_local_history()
        kept = [
            doc for doc in docs
            if not (
                str(doc.get("id")) == str(analysis_id)
                and str(doc.get("user_id")) == str(user_id)
            )
        ]
        if len(kept) == len(docs):
            return False
        _write_local_history(kept)
        return True

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/analyses"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                url, 
                headers=headers, 
                params={
                    "id": f"eq.{analysis_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            response.raise_for_status()
            return True
    except Exception as exc:
        logger.error(f"Failed to delete analysis {analysis_id} from Supabase: {exc}")
        docs = _load_local_history()
        kept = [
            doc for doc in docs
            if not (
                str(doc.get("id")) == str(analysis_id)
                and str(doc.get("user_id")) == str(user_id)
            )
        ]
        if len(kept) == len(docs):
            return False
        _write_local_history(kept)
        return True
