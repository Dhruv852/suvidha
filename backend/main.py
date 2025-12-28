
import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
import pypdf
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import time

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RAG SYSTEM ---

class RAGSystem:
    def __init__(self):
        self.chunks = []
        self.metadata = []
        self.index = None
        self.model = None
        self.is_ready = False
        
    def load_documents(self):
        print("Loading embeddings model (this may take a moment)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        base_path = os.path.dirname(os.path.abspath(__file__))
        
        # User specified files
        docs_config = [
            ("GFR 2017", os.path.join(base_path, "gfr_2017.txt")),
            ("Procurement Manual 2025", os.path.join(base_path, "pm2025.txt"))
        ]

        all_chunks = []
        all_meta = []
        
        for name, txt_path in docs_config:
            if os.path.exists(txt_path):
                print(f"Loading {name} from {os.path.basename(txt_path)}...")
                try:
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                    
                    # Clean the text but keep structure roughly
                    # Replace excessive newlines but keep some paragraph structure
                    # Ideally we want a sliding window over the whole text
                    text_clean = " ".join(file_content.replace('\n', ' ').split())
                    
                    # Chunking Strategy:
                    # 1000 char chunks with 200 char overlap.
                    # This ensures we don't cut off sentences or rules in the middle of a chunk without context.
                    chunk_size = 1000
                    overlap = 100
                    
                    total_len = len(text_clean)
                    for start in range(0, total_len, chunk_size - overlap):
                        chunk_text = text_clean[start:start + chunk_size]
                        if len(chunk_text) < 100: continue
                        
                        all_chunks.append(chunk_text)
                        
                        # Approximate page number (very rough, just for reference if real page meta isn't available)
                        # Assuming ~3000 chars per page on average
                        approx_page = (start // 3000) + 1
                        
                        all_meta.append({
                            "source": name,
                            "page": approx_page, # Approximate
                            "file": os.path.basename(txt_path)
                        })
                        
                except Exception as e:
                     print(f"Error reading Text file {txt_path}: {e}")
            else:
                 print(f"Warning: Source file not found: {txt_path}")
        
        print(f"Total chunks created: {len(all_chunks)}")
        self.chunks = all_chunks
        self.metadata = all_meta
        
        if all_chunks:
            print("Generating embeddings...")
            embeddings = self.model.encode(all_chunks)
            print("Building FAISS index...")
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(embeddings.astype('float32'))
            self.is_ready = True
            print("RAG System Ready!")
        else:
            print("Warning: No chunks loaded.")

    def search(self, query, k=5):
        if not self.is_ready:
            return []
            
        q_emb = self.model.encode([query])
        D, I = self.index.search(q_emb.astype('float32'), k)
        
        results = []
        for idx in I[0]:
            if idx != -1 and idx < len(self.chunks):
                results.append({
                    "text": self.chunks[idx],
                    "meta": self.metadata[idx]
                })
        return results

rag = RAGSystem()

@app.on_event("startup")
async def startup_event():
    # Load RAG in background to not block startup completely, 
    # but for local dev it's better to just wait
    rag.load_documents()

class Message(BaseModel):
    role: str
    content: str
    citations: list | None = None

class ChatRequest(BaseModel):
    message: str
    history: list[Message]

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
             raise HTTPException(status_code=500, detail="API Key missing")

        client = genai.Client(api_key=api_key)
        
        # 1. Retrieve relevant chunks
        print(f"Searching for: {request.message}")
        relevant_chunks = rag.search(request.message, k=15) # Get top 15 chunks
        
        # 2. Construct Context
        context_str = ""
        for i, chunk in enumerate(relevant_chunks):
            meta = chunk['meta']
            context_str += f"""
Chunk {i+1}:
Source: {meta['source']}, Page: {meta['page']}
Content: {chunk['text']}
---
"""
        
        print(f"Retrieved {len(relevant_chunks)} chunks using {len(context_str)} chars context.")

        sys_instruct = f"""You are 'Suvidha', a specialized AI assistant for the Government of India's GFR 2017 and PM 2025.
        
        Use the provided 'Retrieved Context' to answer the user's question. 
        If the answer is not in the context, politely say you don't have that specific information in the loaded documents.
        
        Retrieved Context:
        {context_str}
        
        Instructions:
        1. Answer strictly based on the provided context.
        2. Provide specific citations (Rule numbers, Page numbers) from the contact.
        3. Output JSON with "response" (Markdown) and "citations" list.
        """
        
        # 3. Call Gemini
        # Prepare history (minimal)
        contents = []
        # Only last 2-3 messages for convo flow, context is in system prompt
        recent_history = request.history[-3:] 
        for msg in recent_history:
             role = "user" if msg.role == "user" else "model"
             contents.append(types.Content(role=role, parts=[types.Part(text=msg.content)]))
        
        contents.append(types.Content(role="user", parts=[types.Part(text=request.message)]))
        
        # With RAG, context is small, so we don't expect 429 on 2.5-flash as often.
        # But keeping fallback logic is good practice.
        models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
        
        response = None
        last_error = None
        
        for model in models:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=sys_instruct,
                        response_mime_type="application/json",
                        temperature=0.3
                    )
                )
                print(f"Success with {model}")
                break
            except Exception as e:
                print(f"Error with {model}: {e}")
                last_error = e
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    continue
        
        if response is None:
             raise last_error

        try:
            return json.loads(response.text)
        except:
            return {"response": response.text, "citations": []}

    except Exception as e:
        print(f"Error: {e}")
        return {
            "response": "I'm encountering an issue connecting to the knowledge base. Please check the backend logs.",
            "citations": []
        }

@app.get("/health")
def health_check():
    return {"status": "ok", "rag_ready": rag.is_ready}
