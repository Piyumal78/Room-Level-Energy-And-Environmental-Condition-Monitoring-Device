import React, { useState } from "react";
import axios from "axios";

function ChatBot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // Add user message to chat
    setMessages((msgs) => [...msgs, { role: "user", content: input }]);
    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { role: "user", content: input },
        { role: "bot", content: data.reply }
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: "bot", content: "Error: Could not get response from chatbot." }
      ]);
    }
    setInput("");
  };

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>AudITFlow ChatBot</h2>
      <div style={{ minHeight: 200, marginBottom: 16 }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <b>{msg.role === "user" ? "You" : "Bot"}:</b> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && sendMessage()}
        style={{ width: "80%", padding: 8, marginRight: 8 }}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage} style={{ padding: "8px 16px" }}>Send</button>
    </div>
  );
}

function ChatBotLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Floating button to open chatbot */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            leftt: 24,
            borderRadius: "50%",
            width: 56,
            height: 56,
            background: "#2563eb",
            color: "#fff",
            fontSize: 24,
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer"
          }}
          aria-label="Open ChatBot"
        >
          💬
        </button>
      )}

      {/* ChatBot window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 8,
            boxShadow: "0 2px 16px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{ textAlign: "right", padding: 4 }}>
            <button onClick={() => setOpen(false)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>
              ✖
            </button>
          </div>
          <ChatBot />
        </div>
      )}
    </div>
  );
}

export default ChatBotLauncher;
