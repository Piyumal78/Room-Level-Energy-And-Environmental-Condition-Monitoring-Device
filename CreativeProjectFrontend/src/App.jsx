import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./components/Login"
import EnergyAuditDashboard from "./components/EnergyAuditDashboard"
import ChatBot from "./components/Chatbot" // Fixed: Chatbot with lowercase 'b'

function App() {
  return (
    <BrowserRouter>
      <div>
        {/* Other components */}
        <ChatBot />
        <Routes>
          {/* Default route to the Login page */}
          <Route path="/" element={<Login />} />

          {/* Route to the Energy Audit Dashboard */}
          <Route path="/dashboard" element={<EnergyAuditDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
