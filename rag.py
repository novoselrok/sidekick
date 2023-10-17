import argparse
from typing import List, Dict

import llms
from vectordb import Memory

model = llms.init("gpt-3.5-turbo")

rag_prompt = """Your name is Sidekick. You are a helpful assistant tasked with providing answers to my questions. I will provide a question with all the necessary context, and you will do your best to provide a helpful and truthful answer.
Example format:
Document A:
<context from document A>
Document B:
<context from document B>
...
Document Z:
<context from document Z>
Question: <question>
Answer:
<your answer>
Let's try this now:
{context}
Question: {question}
Answer:
"""


def document_to_prompt_example(document: str, title: str) -> str:
    return f"Document {title}:\n{document}"


def get_references(metadata: List[Dict[str, str]]) -> List[Dict[str, str]]:
    unique_references = {result["path"]: result["title"] for result in metadata}
    return [{"path": path, "title": title} for path, title in unique_references.items()]


def rag(db: Memory, query: str) -> str:
    results = db.search(query, top_n=5)
    context = "\n".join(
        [
            document_to_prompt_example(result["chunk"], result["metadata"]["title"])
            for result in results
        ]
    )
    prompt = rag_prompt.replace("{context}", context).replace("{question}", query)
    result = model.complete(prompt, temperature=0, max_tokens=500)
    return {
        "answer": result.text,
        "references": get_references((result["metadata"] for result in results)),
    }


def main(args):
    memory = Memory(memory_file=args.db, embedding_model="intfloat/e5-base-v2")
    answer = rag(memory, args.query)
    print("Answer:", answer["answer"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", dest="db")
    parser.add_argument("--query", dest="query")
    args = parser.parse_args()

    main(args)
