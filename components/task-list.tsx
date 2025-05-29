"use client"

import { useState, useEffect, useCallback } from "react"
import TaskCard from "./task-card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"

type Task = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
  assignedTo?: string
  createdAt?: string
}

type TaskListProps = {
  tasks?: Task[] // now optional, for SSR fallback
}

export default function TaskList({ tasks: initialTasks = [] }: TaskListProps) {
  const [filter, setFilter] = useState<string>("all")
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loading, setLoading] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, due_date, assigned_to, created_at")
      .order("due_date", { ascending: true })
    if (!error && data) {
      setTasks(
        data.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.due_date,
          assignedTo: task.assigned_to,
          createdAt: task.created_at,
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Helper to normalize status for filtering
  const normalizeStatus = (status: string) => {
    if (status.toLowerCase() === "pending") return "in-progress"
    if (status.toLowerCase() === "not started") return "todo"
    if (status.toLowerCase() === "completed") return "completed"
    return status.toLowerCase()
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true
    return normalizeStatus(task.status) === filter
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">
          All
        </Button>
        <Button variant={filter === "todo" ? "default" : "outline"} onClick={() => setFilter("todo")} size="sm">
          To Do
        </Button>
        <Button
          variant={filter === "in-progress" ? "default" : "outline"}
          onClick={() => setFilter("in-progress")}
          size="sm"
        >
          In Progress
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          size="sm"
        >
          Completed
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No tasks found</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onTaskUpdated={fetchTasks} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
