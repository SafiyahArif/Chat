# Gemini Chat — Real-Time AI Chatbot

A Python + Flask web app powered by **Google Gemini 1.5 Flash** with:
- **Conversation memory** — full multi-turn chat history per session
- **Real-time web search** — auto-triggered for live queries (prices, weather, news…)
- **Clean dark UI** — sidebar, quick-search buttons, source citations

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10 or higher |
| pip | any recent version |

---

## Step 1 — Get API Keys

### A. Gemini API Key (required)
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API key**
3. Copy the key — you'll paste it in `.env`

### B. Google Search API (optional — enables live data)
You need two values for real-time search:

**API Key:**
1. Go to https://console.cloud.google.com/
2. Create a project (or use an existing one)
3. Go to **APIs & Services → Library**, search for **Custom Search API**, enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key

**Search Engine ID (cx):**
1. Go to https://programmablesearchengine.google.com/
2. Click **Add** → give it a name
3. Under **Search the entire web**, toggle it ON
4. Click **Create**, then go to the engine's settings
5. Copy the **Search engine ID**

---

## Step 2 — Configure the .env file

Open `.env` and fill in your keys:

```
GEMINI_API_KEY=AIza...your_key_here
GOOGLE_SEARCH_API_KEY=AIza...your_key_here   # optional
GOOGLE_SEARCH_CX=12345abcde:xyz              # optional
SECRET_KEY=any-random-string-you-want
```

---

## Step 3 — Install dependencies

Open a terminal in the `gemini_chat/` folder and run:

```bash
pip install -r requirements.txt
```

> On some systems you may need `pip3` instead of `pip`.

---

## Step 4 — Run the app

```bash
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

Open your browser and go to: **http://localhost:5000**

---

## Usage Tips

| Action | How |
|---|---|
| Send a message | Type and press **Enter** |
| New line in input | Press **Shift + Enter** |
| Quick live queries | Click the shortcut buttons in the sidebar |
| View web sources | Click the "🔍 N web sources used" button under any AI reply |
| Clear chat history | Click **Clear conversation** in the sidebar |

### Queries that trigger real-time search
Any message containing words like: `price`, `weather`, `news`, `today`, `current`, `latest`, `bitcoin`, `stock`, `score`, `rate`, `forecast`, `2025`, `2026`, etc.

---

## Project Structure

```
gemini_chat/
├── app.py                  ← Flask server + Gemini + Search logic
├── requirements.txt        ← Python dependencies
├── .env                    ← Your API keys (never share this file)
├── templates/
│   └── index.html          ← Main HTML page
└── static/
    ├── css/style.css       ← All styles
    └── js/main.js          ← Frontend logic
```

---

## Troubleshooting

**"GEMINI_API_KEY not set"**  
→ Make sure `.env` is in the same folder as `app.py` and the key is correct.

**Real-time search not working**  
→ Check that both `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX` are set.  
→ Confirm the Custom Search API is enabled in Google Cloud Console.

**`ModuleNotFoundError`**  
→ Run `pip install -r requirements.txt` again.

**Port already in use**  
→ Either stop the other process, or change the port in `app.py`:  
`app.run(debug=True, port=5001)`

---

## Notes

- Chat history is stored in your browser session (server-side filesystem). It resets when the server restarts.
- The app keeps the last **50 turns** of history per session.
- The Google Custom Search API free tier allows 100 searches/day.
