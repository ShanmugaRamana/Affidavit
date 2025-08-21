# /backend/services/vector_store.py

from langchain_community.embeddings import HuggingFaceEmbeddings
# UPDATED: Import Chroma instead of ScaNN
from langchain_community.vectorstores import Chroma

def create_vector_store(text_chunks: list):
    """
    Creates an in-memory Chroma vector store from a list of text chunks.
    """
    if not text_chunks:
        return None
        
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # UPDATED: Use Chroma.from_documents. For this use case, it will run entirely in-memory.
    vector_store = Chroma.from_documents(documents=text_chunks, embedding=embeddings)
    
    return vector_store