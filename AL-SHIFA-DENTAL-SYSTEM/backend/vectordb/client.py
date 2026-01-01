# backend/vectordb/client.py

import chromadb
from chromadb.config import Settings


class VectorDBClient:
    """
    Central VectorDB client.
    Used by Case Tracking Agent (RAG).
    """

    def __init__(self, persist_directory: str = "./vector_store"):
        self.client = chromadb.Client(
            Settings(
                persist_directory=persist_directory,
                anonymized_telemetry=False
            )
        )

    def get_collection(self, name: str):
        return self.client.get_or_create_collection(name=name)
