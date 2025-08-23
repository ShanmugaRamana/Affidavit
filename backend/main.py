import os
import tempfile
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

from services.document_processor import get_document_chunks
from services.vector_store import create_vector_store
from services.summarizer import get_summary_from_llm
from services.qa_service import get_answer

load_dotenv()

vector_store_cache = {}

class ChatRequest(BaseModel):
    sessionId: str
    question: str

app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/summarize/")
async def summarize_document(file: UploadFile = File(...)):
    try:
        file_extension = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
        
        text_chunks = get_document_chunks(tmp_path, file_extension)
        vector_store = create_vector_store(text_chunks)
        summary = get_summary_from_llm(vector_store)

        session_id = str(uuid.uuid4())
        vector_store_cache[session_id] = vector_store
        print(f"Cached vector store for session: {session_id}")

        return {"filename": file.filename, "summary": summary, "sessionId": session_id}
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/chat/")
async def chat_with_document(request: ChatRequest):
    vector_store = vector_store_cache.get(request.sessionId)
    if not vector_store:
        raise HTTPException(status_code=404, detail="Session not found or has expired.")

    answer = get_answer(vector_store, request.question)
    return {"answer": answer}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Legal Document Demystifier AI Backend"}