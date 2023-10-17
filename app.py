import os

from flask import Flask, render_template, request
from vectordb import Memory

from rag import rag

app = Flask(__name__, static_url_path="/sidekick/static")

db = Memory(
    memory_file=os.getenv("SIDEKICK_VECTOR_DB_PATH"),
    embedding_model="intfloat/e5-base-v2",
)


@app.route("/sidekick")
def index():
    return render_template("index.html")


@app.route("/sidekick/api/query", methods=["POST"])
def query():
    body = request.json
    return rag(db, body["query"])
