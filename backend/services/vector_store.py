# /backend/services/vector_store.py

from langchain_community.embeddings import HuggingFaceEmbeddings
# UPDATED: Import ScaNN instead of FAISS
from langchain_community.vectorstores import ScaNN

def create_vector_store(text_chunks: list):
    """
    Creates an in-memory ScaNN vector store from a list of text chunks.
    """
    if not text_chunks:
        return None
        
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # UPDATED: Use ScaNN.from_documents instead of FAISS.from_documents
    vector_store = ScaNN.from_documents(text_chunks, embedding=embeddings)
    
    return vector_store