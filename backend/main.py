
import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import the refactored service functions
from services.document_processor import get_document_chunks
from services.vector_store import create_vector_store
from services.summarizer import get_summary_from_llm

# Load environment variables from the .env file
load_dotenv()

# --- App Initialization & CORS ---
app = FastAPI()
origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---
@app.post("/summarize/")
async def summarize_document(file: UploadFile = File(...)):
    """
    Endpoint to receive an uploaded document, process it, and return a summary.
    """
    file_extension = os.path.splitext(file.filename)[1]
    
    if file_extension not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or DOCX.")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # 1. Process Document
        text_chunks = get_document_chunks(tmp_path, file_extension)
        if not text_chunks:
            raise HTTPException(status_code=500, detail="Could not process the document.")

        # 2. Create Vector Store
        vector_store = create_vector_store(text_chunks)
        if not vector_store:
             raise HTTPException(status_code=500, detail="Could not create vector store.")

        # 3. Generate Summary
        summary = get_summary_from_llm(vector_store)
        if not summary:
            raise HTTPException(status_code=500, detail="Could not generate summary.")
            
        return {"filename": file.filename, "summary": summary}

    finally:
        # Clean up the temporary file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.get("/")
def read_root():
    """
    Root endpoint that returns a welcome message.
    """
    return {"message": "Welcome to the Legal Document Demystifier AI Backend (Powered by Llama 3)"}