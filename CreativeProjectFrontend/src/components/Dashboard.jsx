import { useEffect, useState } from "react";
import FirebaseDataChart from "./FirebaseDataChart";

function Dashboard() {
  const [latest, setLatest] = useState({});
  const [events, setEvents] = useState([]);
  const [chatReply, setChatReply] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Fetch latest data on mount
  useEffect(() => {
    fetch("http://localhost:3000/latest")
      .then(res => res.json())
      .then(data => setLatest(data));
  }, []);

  // Fetch events for selected month/year
  const getEvents = (month, year) => {
    fetch(`http://localhost:3000/events?month=${month}&year=${year}`)
      .then(res => res.json())
      .then(data => setEvents(data));
  };

  // Send chat message
  const sendChat = (msg) => {
    fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    })
      .then(res => res.json())
      .then(data => setChatReply(data.reply));
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Firebase Real-time Data Visualization */}
      <FirebaseDataChart />

      {/* Original API Data Section */}
      <h2>Latest API Data</h2>
      <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(latest, null, 2)}
      </pre>

      <h2>Events</h2>
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>Month:</label>
        <input 
          type="number" 
          value={month} 
          onChange={e => setMonth(parseInt(e.target.value))} 
          min="1" 
          max="12"
          style={{ marginRight: 16, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: '60px' }}
        />
        <label style={{ marginRight: 8 }}>Year:</label>
        <input 
          type="number" 
          value={year} 
          onChange={e => setYear(parseInt(e.target.value))} 
          min="2020"
          style={{ marginRight: 16, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: '80px' }}
        />
        <button 
          onClick={() => getEvents(month, year)}
          style={{ 
            padding: '6px 12px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Load Events for {month}/{year}
        </button>
      </div>
      <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
        {JSON.stringify(events, null, 2)}
      </pre>

      <h2>Chatbot</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Type a message"
          onKeyPress={(e) => e.key === 'Enter' && sendChat(chatInput)}
          style={{ 
            flex: 1, 
            padding: 8, 
            borderRadius: 4, 
            border: '1px solid #ccc' 
          }}
        />
        <button 
          onClick={() => sendChat(chatInput)}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </div>
      <div style={{ 
        padding: 12, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 4, 
        border: '1px solid #dee2e6' 
      }}>
        <strong>Bot:</strong> {chatReply || "No response yet..."}
      </div>
    </div>
  );
}

export default Dashboard;