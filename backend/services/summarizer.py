import os
from langchain.chains.summarize import load_summarize_chain
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv
from pathlib import Path
dotenv_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=dotenv_path)

def get_summary_from_llm(vector_store: FAISS):
    if not vector_store:
        return None
    
    try:
        # Use OpenAI-compatible API for OpenRouter
        llm = ChatOpenAI(
            model="meta-llama/llama-3-8b-instruct",
            temperature=0.1,
            openai_api_key = os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://localhost:3000",
                "X-Title": "Affidavit"
            }
        )
        
        chain = load_summarize_chain(llm, chain_type="stuff")
        docs = vector_store.similarity_search(
            query="Summarize the key points of this document", 
            k=4
        )
        
        if not docs:
            return "No relevant documents found for summarization."
        
        result = chain.invoke({"input_documents": docs})
        
        if isinstance(result, dict):
            summary = result.get("output_text", str(result))
        else:
            summary = str(result)
            
        return summary
        
    except Exception as e:
        print(f"Error in get_summary_from_llm: {str(e)}")
        return f"Error generating summary: {str(e)}"