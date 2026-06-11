import os
import json
import requests
from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import google.generativeai as genai
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "gemini-chat-secret-key-2024")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
Session(app)

# ── API keys (loaded from environment) ───────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GOOGLE_SEARCH_API_KEY = os.environ.get("GOOGLE_SEARCH_API_KEY", "")
GOOGLE_SEARCH_CX = os.environ.get("GOOGLE_SEARCH_CX", "")  # Custom Search Engine ID

# ── Configure Gemini ──────────────────────────────────────────────────────────
def get_gemini_model():
    if not GEMINI_API_KEY:
        return None
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config={
            "temperature": 0.7,
            "top_p": 0.95,
            "max_output_tokens": 2048,
        },
        system_instruction=(
            "You are a helpful, intelligent assistant with access to real-time web search results. "
            "When given search results, synthesize them naturally and cite key facts. "
            "Be concise, accurate, and conversational. "
            f"Today's date is {datetime.now().strftime('%B %d, %Y')}."
        ),
    )


# ── Google Search helper ──────────────────────────────────────────────────────
def google_search(query: str, num_results: int = 5) -> list[dict]:
    """Call Google Custom Search API and return snippet list."""
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_CX:
        return []
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": GOOGLE_SEARCH_API_KEY,
        "cx": GOOGLE_SEARCH_CX,
        "q": query,
        "num": num_results,
        "dateRestrict": "m1",  # prefer results from last month
    }
    try:
        resp = requests.get(url, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("items", []):
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "link": item.get("link", ""),
            })
        return results
    except Exception as e:
        return [{"error": str(e)}]


def needs_real_time_data(message: str) -> bool:
    """Decide whether a user message likely needs live search."""
    keywords = [
        "price", "weather", "news", "today", "current", "latest", "now",
        "live", "stock", "crypto", "bitcoin", "ethereum", "rate", "score",
        "match", "game", "forecast", "temperature", "trend", "happening",
        "update", "recent", "real-time", "realtime", "2024", "2025", "2026",
    ]
    lower = message.lower()
    return any(kw in lower for kw in keywords)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if "history" not in session:
        session["history"] = []
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set. Please configure your .env file."}), 500

    history: list = session.get("history", [])
    search_context = ""
    search_results = []

    # ── Real-time search (optional) ───────────────────────────────────────────
    if needs_real_time_data(user_message):
        raw = google_search(user_message)
        if raw and "error" not in raw[0]:
            search_results = raw
            snippets = "\n".join(
                f"[{i+1}] {r['title']}: {r['snippet']}" for i, r in enumerate(raw)
            )
            search_context = (
                f"\n\n[REAL-TIME SEARCH RESULTS for '{user_message}']:\n{snippets}\n"
                "[Use the above results to answer the user's question accurately.]"
            )

    # ── Build Gemini conversation history ────────────────────────────────────
    model = get_gemini_model()
    gemini_history = []
    for turn in history:
        gemini_history.append({"role": "user", "parts": [turn["user"]]})
        gemini_history.append({"role": "model", "parts": [turn["assistant"]]})

    chat_session = model.start_chat(history=gemini_history)

    # Append search context to user message if available
    augmented_message = user_message + search_context

    try:
        response = chat_session.send_message(augmented_message)
        assistant_reply = response.text
    except Exception as e:
        return jsonify({"error": f"Gemini API error: {str(e)}"}), 500

    # ── Persist turn in session ───────────────────────────────────────────────
    history.append({"user": user_message, "assistant": assistant_reply})
    session["history"] = history[-50:]  # keep last 50 turns

    return jsonify({
        "reply": assistant_reply,
        "search_used": bool(search_results),
        "search_results": search_results,
    })


@app.route("/clear", methods=["POST"])
def clear():
    session["history"] = []
    return jsonify({"status": "cleared"})


@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(session.get("history", []))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
