/* ── DOM refs ─────────────────────────────────────────────────────────────── */
const messagesEl   = document.getElementById("messages");
const welcomeState = document.getElementById("welcomeState");
const userInput    = document.getElementById("userInput");
const sendBtn      = document.getElementById("sendBtn");
const clearBtn     = document.getElementById("clearBtn");
const statusDot    = document.getElementById("statusDot");
const statusText   = document.getElementById("statusText");
const turnCounter  = document.getElementById("turnCounter");
const searchBadge  = document.getElementById("searchBadge");
const menuToggle   = document.getElementById("menuToggle");
const sidebar      = document.querySelector(".sidebar");

let turnCount = 0;
let sourcesVisible = {};

/* ── Status ping ─────────────────────────────────────────────────────────── */
async function checkStatus() {
  try {
    const r = await fetch("/history");
    if (r.ok) {
      statusDot.classList.add("online");
      statusText.textContent = "Connected";
    }
  } catch {
    statusDot.classList.add("error");
    statusText.textContent = "Offline";
  }
}
checkStatus();

/* ── Auto-resize textarea ────────────────────────────────────────────────── */
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 160) + "px";
});

/* ── Keyboard shortcuts ──────────────────────────────────────────────────── */
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* ── Quick buttons ───────────────────────────────────────────────────────── */
document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    userInput.value = btn.dataset.msg;
    userInput.dispatchEvent(new Event("input"));
    sendMessage();
    if (window.innerWidth <= 680) sidebar.classList.remove("open");
  });
});

/* ── Mobile menu ─────────────────────────────────────────────────────────── */
menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 680 && !sidebar.contains(e.target) && e.target !== menuToggle) {
    sidebar.classList.remove("open");
  }
});

/* ── Clear ───────────────────────────────────────────────────────────────── */
clearBtn.addEventListener("click", async () => {
  await fetch("/clear", { method: "POST" });
  messagesEl.innerHTML = "";
  messagesEl.appendChild(welcomeState);
  welcomeState.style.display = "flex";
  turnCount = 0;
  turnCounter.textContent = "0 turns";
  searchBadge.style.display = "none";
});

/* ── Send button ─────────────────────────────────────────────────────────── */
sendBtn.addEventListener("click", sendMessage);

/* ── Markdown-ish formatter (light) ─────────────────────────────────────── */
function formatText(raw) {
  // Escape HTML
  let s = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
  );

  // Inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Newlines (preserve)
  s = s.replace(/\n/g, "<br>");

  return s;
}

/* ── Append a message bubble ─────────────────────────────────────────────── */
function appendBubble(role, content, searchResults = []) {
  welcomeState.style.display = "none";

  const group = document.createElement("div");
  group.className = "message-group";

  const isUser = role === "user";

  // Gem icon SVG for AI
  const gemSVG = `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,2 26,9 26,19 14,26 2,19 2,9" fill="url(#bGrad)"/>
    <defs>
      <linearGradient id="bGrad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#7C6AF7"/><stop offset="100%" stop-color="#4FC3F7"/>
      </linearGradient>
    </defs>
  </svg>`;

  group.innerHTML = `
    <div class="bubble ${isUser ? "user" : "ai"}">
      <div class="bubble-avatar ${isUser ? "user-av" : "ai-av"}">
        ${isUser ? "U" : gemSVG}
      </div>
      <div class="bubble-body">
        <div class="bubble-role">${isUser ? "You" : "Gemini"}</div>
        <div class="bubble-text">${isUser ? escHtml(content) : formatText(content)}</div>
        ${searchResults.length ? buildSourcesBlock(searchResults) : ""}
      </div>
    </div>
  `;

  messagesEl.appendChild(group);
  scrollToBottom();
  return group;
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
}

function buildSourcesBlock(results) {
  const id = "src-" + Date.now();
  const items = results.map(r => `
    <div class="source-item">
      <a href="${r.link}" target="_blank" rel="noopener">${r.title}</a>
      ${r.snippet}
    </div>
  `).join("");
  return `
    <button class="sources-toggle" onclick="toggleSources('${id}')">
      🔍 ${results.length} web sources used
    </button>
    <div class="sources-list" id="${id}" style="display:none">${items}</div>
  `;
}

/* ── Typing indicator ────────────────────────────────────────────────────── */
function showTyping() {
  const group = document.createElement("div");
  group.className = "message-group";
  group.id = "typing-indicator";
  group.innerHTML = `
    <div class="bubble ai typing-bubble">
      <div class="bubble-avatar ai-av">
        <svg viewBox="0 0 28 28" fill="none">
          <polygon points="14,2 26,9 26,19 14,26 2,19 2,9" fill="url(#tGrad)"/>
          <defs><linearGradient id="tGrad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#7C6AF7"/><stop offset="100%" stop-color="#4FC3F7"/>
          </linearGradient></defs>
        </svg>
      </div>
      <div class="bubble-body">
        <div class="bubble-role">Gemini</div>
        <div class="bubble-text">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>
  `;
  messagesEl.appendChild(group);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

/* ── Error ───────────────────────────────────────────────────────────────── */
function showError(msg) {
  const div = document.createElement("div");
  div.className = "error-toast";
  div.textContent = "⚠ " + msg;
  messagesEl.appendChild(div);
  scrollToBottom();
  setTimeout(() => div.remove(), 8000);
}

/* ── Toggle sources ──────────────────────────────────────────────────────── */
function toggleSources(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "flex" : "none";
}

/* ── Scroll ──────────────────────────────────────────────────────────────── */
function scrollToBottom() {
  messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
}

/* ── Main send ───────────────────────────────────────────────────────────── */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  userInput.value = "";
  userInput.style.height = "auto";
  sendBtn.disabled = true;

  appendBubble("user", text);
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    removeTyping();

    if (!res.ok) {
      showError(data.error || "Something went wrong.");
    } else {
      appendBubble("ai", data.reply, data.search_results || []);

      if (data.search_used) {
        searchBadge.style.display = "flex";
        setTimeout(() => (searchBadge.style.display = "none"), 4000);
      }

      turnCount++;
      turnCounter.textContent = `${turnCount} turn${turnCount !== 1 ? "s" : ""}`;
    }
  } catch (err) {
    removeTyping();
    showError("Network error: " + err.message);
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}
