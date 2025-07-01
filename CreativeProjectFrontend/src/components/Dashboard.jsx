// import { useEffect, useState } from "react";

// function Dashboard() {
//   const [latest, setLatest] = useState({});
//   const [events, setEvents] = useState([]);
//   const [chatReply, setChatReply] = useState("");
//   const [chatInput, setChatInput] = useState("");
//   const [year, setYear] = useState(new Date().getFullYear());
//   const [month, setMonth] = useState(new Date().getMonth() + 1);

//   // Fetch latest data on mount
//   useEffect(() => {
//     fetch("http://localhost:3000/latest")
//       .then(res => res.json())
//       .then(data => setLatest(data));
//   }, []);

//   // Fetch events for selected month/year
//   const getEvents = (month, year) => {
//     fetch(`http://localhost:3000/events?month=${month}&year=${year}`)
//       .then(res => res.json())
//       .then(data => setEvents(data));
//   };

//   // Send chat message
//   const sendChat = (msg) => {
//     fetch("http://localhost:3000/chat", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ message: msg }),
//     })
//       .then(res => res.json())
//       .then(data => setChatReply(data.reply));
//   };

//   return (
//     <div style={{ padding: 24 }}>
//       <h2>Latest Data</h2>
//       <pre>{JSON.stringify(latest, null, 2)}</pre>

//       <h2>Events</h2>
//       <button onClick={() => getEvents(month, year)}>
//         Load Events for {month}/{year}
//       </button>
//       <pre>{JSON.stringify(events, null, 2)}</pre>

//       <h2>Chatbot</h2>
//       <input
//         value={chatInput}
//         onChange={e => setChatInput(e.target.value)}
//         placeholder="Type a message"
//         style={{ marginRight: 8 }}
//       />
//       <button onClick={() => sendChat(chatInput)}>Send</button>
//       <div>
//         <b>Bot:</b> {chatReply}
//       </div>
//     </div>
//   );
// }

// export default Dashboard;