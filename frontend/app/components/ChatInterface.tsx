'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { PaperAirplaneIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid'

interface Message {
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{
    rule_number: string
    text: string
    source: string
    page: number
  }>
}

const ThinkingAnimation = () => (
  <div className="flex justify-start">
    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-gray-200 mr-12">
      <div className="flex space-x-2">
        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" />
      </div>
    </div>
  </div>
)

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
        ? `${process.env.NEXT_PUBLIC_API_URL}/chat`
        : '/api/chat'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages,
        }),
      })

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        citations: data.citations,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([])
    }
  }

  const handleExportChat = () => {
    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      citations: msg.citations
    }))

    const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-[600px] flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900">Chat Assistant</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleExportChat}
            disabled={messages.length === 0}
            className="btn btn-secondary flex items-center space-x-1 text-sm"
            title="Export chat history"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="btn btn-secondary flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
            title="Clear chat history"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${message.role === 'user'
                    ? 'bg-primary-600 text-white ml-12'
                    : 'bg-white border border-gray-200 mr-12'
                  }`}
              >
                <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.citations && message.citations.length > 0 && (
                  <div className={`mt-3 space-y-2 ${message.role === 'user' ? 'border-t border-primary-500 pt-3' : 'border-t border-gray-200 pt-3'}`}>
                    {message.citations.map((citation, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 ${message.role === 'user'
                            ? 'bg-primary-500/10'
                            : 'bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${message.role === 'user'
                              ? 'text-primary-200'
                              : 'text-primary-600'
                            }`}>
                            {citation.source} - Rule {citation.rule_number}
                          </span>
                          <span className={`text-xs ${message.role === 'user'
                              ? 'text-primary-200'
                              : 'text-gray-500'
                            }`}>
                            Page {citation.page}
                          </span>
                        </div>
                        <p className={`mt-1 text-sm ${message.role === 'user'
                            ? 'text-primary-100'
                            : 'text-gray-700'
                          }`}>
                          {citation.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ThinkingAnimation />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-white p-4"
      >
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about GFR or PM..."
            className="input flex-1 bg-gray-50 focus:bg-white transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn btn-primary flex items-center space-x-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  )
} 