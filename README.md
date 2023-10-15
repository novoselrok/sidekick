# Sidekick

Sidekick is an LLM assistant that answers questions about a particular website using Retrieval Augmented Generation (RAG).

## Usage Instructions

Step 1: Install the dependencies

```bash
npm install
pip3 install -r requirements.txt
```

Step 2: Download the website files

```bash
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent https://example.com
```

Step 3: Launch the local web server

```bash
cd example.com
python3 -m http.server
```

Step 4: Extract the documents

```bash
node crawler.js
    --directory=/path/to/example.com
    --local-host=http://localhost:8000
    --output=documents.jsonl
    --remote-host=https://example.com
```

Step 5: Create the vector DB

```bash
python3 create_vector_db.py  --documents=documents.jsonl --output=documents.vectordb
```

Step 6: Launch the Sidekick app

```bash
export OPENAI_API_KEY="..."
export SIDEKICK_VECTOR_DB_PATH=/path/to/documents.vectordb
flask --app app run --port 5001
```

## Quality Improvements

To improve the quality of the answers I would like to implement a better retrieval system and a better chunking algorithm.

For the retrieval system, I would like to implement a hybrid retrieval system that combines a classic full-text index and semantic embeddings search. All documents returned from the base retrievers would be additionally scored using a fine-tuned cross-encoder model. Documents would be reranked using Reciprocal Rank Fusion (RRF) fusing the document ranks from full-text search, embeddings search, and cross-encoder.

The retrieval system does not have to be limited to just these retrievers. Additional retrievers like knowledge graph search could also be included and fused to further improve relevance. The weights in the RRF fusion could also be dynamically adjusted based on initial user feedback to better optimize for their information needs.

For the chunking algorithm, we need to incorporate additional metadata about the context of the chunk. We can associate each chunk with a particular page, title, and section headers. By including this additional context into the chunk text, the embedding model can create better semantic representation based on the surrounding context in the page.

For example, let's say we have a chunk with the following content: "Rust can sometimes be very tricky." on a page titled "Learning the Rust programming language." On its own, the chunk could be a viable match for the query "I want to remove rust from my car" and the query "I want to learn a programming language." But by including the page title and section headers in the chunk text, the embedding would better capture that this chunk is specifically about the Rust programming language, not about removing surface rust.

## Building an Automated Service

If we wanted to build this into a service to automatically create a Sidekick assistant for any given website, we would need to implement the following sections.

### Storage Layer

The storage layer would consist of a PostgreSQL database to store the extracted documents with metadata, and a vector database for fast retrieval of embeddings. Optionally, a Neo4j database could be used to store a knowledge graph derived from the documents.

The PostgreSQL table would contain the following tables:

- `raw_documents`: stores the raw extracted HTML with url,
- `documents`: stores the cleaned text content with a foreign key to `raw_documents` table,
- `metadata`: stores structured metadata extracted from documents like title, headings, page sections, etc. with a foreign key to `documents` table,
- `links`: stores hyperlinks between documents with foreign keys to `documents` table,
- `chats`: stores chat conversations.

The vector database would store document embeddings generated from the text chunks in the `documents` table.

### Crawler

The crawler would use Puppeteer to dynamically render and crawl websites. It would store extracted raw HTML in the `raw_documents` table. It would run on a schedule to capture updates and perform deduplication using a hash of the page content.

### Document Processing

The document processing pipeline would:

1. Check the `raw_documents` table for new or updated documents.
1. Clean and normalize the raw HTML stored in the `raw_documents` table. This would remove unnecessary tags, scripts, styles etc.
1. Extract the main textual content and store it in the `documents` table.
1. Extract structured metadata like title, headings, page sections etc from the cleaned document and store it in the `metadata` table.
1. Extract links from the document and store them in the `links` table.

### Indexing

The indexing pipeline is responsible for:

1. Generating embeddings from the document text stored in the `documents` table using an embedding model (e.g., from SentenceTransformers).
1. Creating a full-text index from the document text using Elasticsearch.
1. Creating a knowledge graph from the structured metadata and links stored in the `metadata` and `links` tables using Neo4j.

### Retrieval

The retrieval service would combine all of the available retrievers using hybrid retrieval techniques like reciprocal rank fusion (RRF). See the Quality Improvements section above for an example implementation.

### API

The external API service handles the `/chat` endpoint to receive queries and return responses.

- POST `/chat`

  - Description: Handles initial chat requests by creating a new chat session and returning the chat id.
  - Body: `{query: "..."}`
  - Response: `{id: 1}`

- PUT `/chat/:id`

  - Description: Handles subsequent user questions in a chat by the given chat id.
  - Method: `PUT`
  - Body: `{query: "..."}`
  - Response: `{id: 1}`

- GET `/chat/:id`

  - Description: Returns the chat history for a given chat id.
  - Body: `{query: "..."}`
  - Response: `{id: 1, history: [{"speaker": "user", "message": query}, {"speaker": "bot", "message": "Here is the response to your query"}]}`

To support real-time updates we should leverage WebSockets to push new responses to the client as they are generated. The client would connect to the `/ws` endpoint and subscribe to a chat channel identified by the chat id.
