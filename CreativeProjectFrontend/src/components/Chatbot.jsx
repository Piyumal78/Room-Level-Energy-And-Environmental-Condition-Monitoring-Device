"use client"

import { useState, useRef, useEffect } from "react"
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Minimize2,
  Maximize2,
  RotateCcw,
  Zap,
  TrendingUp,
  Thermometer,
  Droplets,
  Sun,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react"

function ChatBot({ isMinimized, onToggleMinimize }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I'm your AudITFlow Energy Assistant. I can help you with energy monitoring, efficiency tips, and analyzing your consumption data. How can I assist you today?",
      timestamp: new Date(),
      type: "welcome",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setIsTyping(true)

    try {
      const res = await fetch("http://localhost:3000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      // Simulate typing delay for better UX
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: data.reply || "I'm sorry, I couldn't process that request.",
            timestamp: new Date(),
            type: getMessageType(data.reply),
          },
        ])
        setIsTyping(false)
      }, 1000)
    } catch (err) {
      console.error("Chat error:", err)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content:
              "I'm experiencing some technical difficulties. Please try again in a moment, or check your energy dashboard for the latest data.",
            timestamp: new Date(),
            type: "error",
          },
        ])
        setIsTyping(false)
      }, 1000)
    } finally {
      setIsLoading(false)
    }
  }

  const getMessageType = (content) => {
    if (!content) return "default"
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes("error") || lowerContent.includes("problem")) return "error"
    if (lowerContent.includes("warning") || lowerContent.includes("alert")) return "warning"
    if (lowerContent.includes("success") || lowerContent.includes("great") || lowerContent.includes("excellent"))
      return "success"
    if (lowerContent.includes("tip") || lowerContent.includes("recommendation")) return "tip"
    return "default"
  }

  const clearChat = () => {
    setMessages([
      {
        role: "bot",
        content: "Chat cleared! How can I help you with your energy monitoring today?",
        timestamp: new Date(),
        type: "welcome",
      },
    ])
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickActions = [
    { text: "Show energy efficiency tips", icon: <Zap className="h-3 w-3" /> },
    { text: "Analyze current consumption", icon: <TrendingUp className="h-3 w-3" /> },
    { text: "Check temperature status", icon: <Thermometer className="h-3 w-3" /> },
    { text: "Humidity recommendations", icon: <Droplets className="h-3 w-3" /> },
    { text: "Lighting optimization", icon: <Sun className="h-3 w-3" /> },
  ]

  const MessageIcon = ({ type, role }) => {
    if (role === "user") return <User className="h-4 w-4" />

    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "tip":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getMessageStyle = (type) => {
    switch (type) {
      case "error":
        return "border-l-4 border-red-500 bg-red-50"
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-50"
      case "success":
        return "border-l-4 border-green-500 bg-green-50"
      case "tip":
        return "border-l-4 border-blue-500 bg-blue-50"
      case "welcome":
        return "border-l-4 border-purple-500 bg-purple-50"
      default:
        return "bg-gray-50"
    }
  }

  if (isMinimized) {
    return (
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Energy Assistant</h3>
              <p className="text-xs text-gray-500">Ready to help</p>
            </div>
          </div>
          <button onClick={onToggleMinimize} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold">AudITFlow Assistant</h3>
            <p className="text-xs text-blue-100">Energy Monitoring Expert</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user" ? "bg-blue-600 text-white ml-4" : `${getMessageStyle(msg.type)} mr-4`
              }`}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 mt-0.5">
                  <MessageIcon type={msg.type} role={msg.role} />
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.role === "user" ? "text-blue-100" : "text-gray-500"}`}>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 mr-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-gray-500" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setInput(action.text)}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                {action.icon}
                <span>{action.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about energy efficiency, consumption patterns, or get optimization tips..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              style={{ minHeight: "40px", maxHeight: "100px" }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-lg transition-colors ${
              !input.trim() || isLoading ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function ChatBotLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  const toggleChat = () => {
    setIsOpen(!isOpen)
    setHasNewMessage(false)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  // Simulate new message notification (you can connect this to real events)
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setHasNewMessage(true)
      }, 30000) // Show notification after 30 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
   <div className="fixed bottom-4 left-4 z-50">
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="relative group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          aria-label="Open Energy Assistant"
        >
          <MessageCircle className="h-6 w-6" />

          {/* Notification badge */}
          {hasNewMessage && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Energy Assistant
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
            isMinimized ? "w-80 h-20" : "w-96 h-[600px]"
          }`}
        >
          <div className="h-full flex flex-col">
            <ChatBot isMinimized={isMinimized} onToggleMinimize={toggleMinimize} />

            {/* Close button */}
            <button
              onClick={toggleChat}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm transition-colors"
              aria-label="Close chat"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatBotLauncher
