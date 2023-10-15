import argparse
import json
from typing import List, Dict

from vectordb import Memory


def read_documents(documents_path: str) -> List[Dict[str, str]]:
    with open(documents_path, encoding="utf-8") as f:
        for row in f:
            if len(row.strip()) > 0:
                yield json.loads(row)


def create_vector_db(documents_path: str, output_path: str):
    memory = Memory(
        memory_file=output_path,
        chunking_strategy={
            "mode": "sliding_window",
            "window_size": 256,
            "overlap": 32,
        },
        embedding_model="intfloat/e5-small-v2",
    )

    for document in read_documents(documents_path):
        memory.save(
            document["text"], {"path": document["path"], "title": document["title"]}
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--documents", dest="documents")
    parser.add_argument("--output", dest="output")
    args = parser.parse_args()

    create_vector_db(args.documents, args.output)
