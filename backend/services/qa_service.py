import os
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores.faiss import FAISS
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from pathlib import Path

dotenv_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=dotenv_path)

def get_answer(vector_store: FAISS, query: str) -> str:
    """
    Searches the vector store for relevant chunks and generates an answer.
    """
    if not vector_store:
        return "Error: Document not found or session has expired."
    
    try:
        llm = ChatOpenAI(
            model="meta-llama/llama-3-8b-instruct",
            temperature=0.2,  
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://localhost:3000",
                "X-Title": "Affidavit"
            }
        )

        prompt_template = """
        You are a helpful AI assistant tasked with answering questions about a legal document.
        Use only the following pieces of context to answer the question at the end.
        If you don't know the answer from the context provided, just say that you don't know. Do not try to make up an answer.
        Context:
        {context}
        Question: {question}
        
        Helpful Answer:
        """
        
        QA_CHAIN_PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
        
        retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 3})

        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=False,  
            chain_type_kwargs={"prompt": QA_CHAIN_PROMPT} 
        )
                                                        
        result = qa_chain({"query": query})
        return result.get("result", "Sorry, I couldn't find an answer to that.")
        
    except Exception as e:
        print(f"Error in get_answer: {str(e)}")
        return f"Error generating answer: {str(e)}"