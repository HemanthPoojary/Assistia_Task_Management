"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, PencilIcon, MoreVerticalIcon, CheckIcon } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { format } from "date-fns"

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

type TaskCardProps = {
  task: Task
  onTaskUpdated?: () => void
}

export default function TaskCard({ task: initialTask, onTaskUpdated }: TaskCardProps) {
  const [task, setTask] = useState(initialTask)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [tempStatus, setTempStatus] = useState(task.status)
  const [tempPriority, setTempPriority] = useState(task.priority)
  const [tempAssignedTo, setTempAssignedTo] = useState(task.assignedTo || "")
  const [tempDueDate, setTempDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  )

  // Fetch latest task data when component mounts
  useEffect(() => {
    const fetchTaskData = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task.id)
        .single()

      if (error) {
        console.error('Error fetching task:', error)
        return
      }

      if (data) {
        setTask({
          ...data,
          dueDate: data.due_date,
          assignedTo: data.assigned_to,
          createdAt: data.created_at,
        })
        setTempStatus(data.status)
        setTempPriority(data.priority)
        setTempAssignedTo(data.assigned_to || "")
        setTempDueDate(data.due_date ? new Date(data.due_date) : undefined)
      }
    }

    fetchTaskData()
  }, [task.id])

  const updateTask = async (updates: Partial<Task>) => {
    setIsUpdating(true)
    try {
      // Convert frontend property names to database column names
      let dbUpdates: Record<string, any> = {
        ...updates,
        due_date: updates.dueDate,
        assigned_to: updates.assignedTo,
      }
      // Remove undefined/null keys
      dbUpdates = Object.fromEntries(
        Object.entries(dbUpdates).filter(([, v]) => v !== undefined && v !== null)
      )
      // Remove camelCase keys (only keep snake_case for db)
      delete dbUpdates.dueDate
      delete dbUpdates.assignedTo

      const { data, error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error

      // Update local state with the new data
      if (data) {
        const updatedTask = {
          ...data,
          dueDate: data.due_date,
          assignedTo: data.assigned_to,
          createdAt: data.created_at,
        }
        setTask(updatedTask)
        if (onTaskUpdated) onTaskUpdated();
      }

      // Trigger n8n webhook
      try {
        await fetch('/api/trigger-n8n-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            ...dbUpdates,
          }),
        })
      } catch (webhookError) {
        console.error('Failed to trigger n8n webhook:', webhookError)
      }
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSave = async () => {
    await updateTask({
      status: tempStatus,
      priority: tempPriority,
      assignedTo: tempAssignedTo,
      dueDate: tempDueDate?.toISOString(),
    })
    setIsDropdownOpen(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-500 hover:bg-red-600"
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "low":
        return "bg-green-500 hover:bg-green-600"
      default:
        return "bg-blue-500 hover:bg-blue-600"
    }
  }

  // Helper to format priority label
  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
  }

  const getStatusColor = (status: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case "completed":
        return "bg-green-500 hover:bg-green-600"
      case "in-progress":
        return "bg-blue-500 hover:bg-blue-600"
      case "todo":
        return "bg-gray-500 hover:bg-gray-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  // Helper to normalize status for display
  const normalizeStatus = (status: string) => {
    if (status.toLowerCase() === "pending") return "in-progress"
    if (status.toLowerCase() === "not started") return "todo"
    if (status.toLowerCase() === "completed") return "completed"
    return status.toLowerCase()
  }

  const getStatusLabel = (status: string) => {
    const normalized = normalizeStatus(status)
    if (normalized === "in-progress") return "In Progress"
    if (normalized === "todo") return "To Do"
    if (normalized === "completed") return "Completed"
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div variants={item}>
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-bold">{task.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Link href={`/chat?action=update&taskId=${task.id}`}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1 rounded-full hover:bg-muted"
              >
                <PencilIcon size={18} />
              </motion.div>
            </Link>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[300px]">
                <DropdownMenuLabel>Update Task</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-3 space-y-4">
                  <div className="space-y-2">
                    <span className="font-semibold">Status</span>
                    <select 
                      className="w-full p-2 border rounded"
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value)}
                      disabled={isUpdating}
                    >
                      <option value="not started">To Do</option>
                      <option value="pending">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="font-semibold">Priority</span>
                    <select 
                      className="w-full p-2 border rounded"
                      value={tempPriority}
                      onChange={(e) => setTempPriority(e.target.value)}
                      disabled={isUpdating}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">Assigned To</span>
                    <Input
                      value={tempAssignedTo}
                      onChange={(e) => setTempAssignedTo(e.target.value)}
                      placeholder="Enter assignee"
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="font-semibold">Due Date</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          {tempDueDate ? format(tempDueDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tempDueDate}
                          onSelect={setTempDueDate}
                          disabled={isUpdating}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={handleSave}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
          <div className="flex items-center mt-4 text-sm text-muted-foreground">
            <CalendarIcon size={14} className="mr-1" />
            <span>{task.dueDate ? format(new Date(task.dueDate), "PPP") : "No due date"}</span>
          </div>
          {task.assignedTo && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Assigned to:</span> {task.assignedTo}
            </div>
          )}
          {task.createdAt && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-semibold">Created at:</span> {format(new Date(task.createdAt), "PPP")}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Badge className={getStatusColor(task.status)}>
            {getStatusLabel(task.status)}
          </Badge>
          <Badge className={getPriorityColor(task.priority)}>
            {getPriorityLabel(task.priority)}
          </Badge>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
