"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon, SendIcon } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL

type Message = {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get("action")
  const taskId = searchParams.get("taskId")

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Prefill chat input and messages
  useEffect(() => {
    async function prefill() {
      if (action === "create") {
        setInput("Create ")
        setMessages([
          {
            id: "1",
            content: "You are creating a new task. Please provide the details.",
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
      } else if (action === "update" && taskId) {
        // Fetch task name from Supabase
        const { data, error } = await supabase
          .from("tasks")
          .select("title")
          .eq("id", taskId)
          .single()
        const taskName = data?.title || ""
        setInput(`Update ${taskName} `)
        setMessages([
          {
            id: "1",
            content: `You are updating the task: ${taskName}. Please specify what you want to update.`,
            sender: "assistant",
            timestamp: new Date(),
          },
        ])
      }
    }
    prefill()
  }, [action, taskId])

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Send to n8n webhook
    try {
      const response = await fetch("/api/trigger-n8n-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          taskId,
          message: userMessage.content,
        }),
      })
      const result = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: result?.result || result?.message || result?.success || JSON.stringify(result),
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: "There was an error contacting the assistant. Please try again.",
          sender: "assistant",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center mb-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeftIcon size={20} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{action === "create" ? "Create New Task" : "Update Task"}</h1>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <CardFooter className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              <SendIcon size={18} />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
