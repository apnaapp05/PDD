# backend/vectordb/ingest.py

from vectordb.client import VectorDBClient
from vectordb.schema import (
    PATIENT_HISTORY_COLLECTION,
    CLINICAL_GUIDELINES_COLLECTION
)


def ingest_patient_history(doc_id: str, text: str, metadata: dict):
    db = VectorDBClient()
    collection = db.get_collection(PATIENT_HISTORY_COLLECTION)

    collection.add(
        documents=[text],
        metadatas=[metadata],
        ids=[doc_id]
    )


def ingest_clinical_guideline(doc_id: str, text: str, metadata: dict):
    db = VectorDBClient()
    collection = db.get_collection(CLINICAL_GUIDELINES_COLLECTION)

    collection.add(
        documents=[text],
        metadatas=[metadata],
        ids=[doc_id]
    )
