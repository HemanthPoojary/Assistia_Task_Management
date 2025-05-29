import TaskList from "@/components/task-list"
import { Button } from "@/components/ui/button"
import { PlusIcon, MessageCircle } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

export default async function Home() {
  // Fetch tasks from Supabase
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, assigned_to, created_at")
    .order("due_date", { ascending: true })

  if (error) {
    // Optionally handle error (could show a message)
    return <div className="p-8 text-red-500">Failed to load tasks: {error.message}</div>
  }

  // Map Supabase data to the Task type expected by TaskList
  const tasks = (data || []).map((task: any) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    assignedTo: task.assigned_to,
    createdAt: task.created_at,
  }))

  return (
    <main className="container mx-auto p-4 md:p-6 relative min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Task Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-3">
          <TaskList tasks={tasks} />
        </div>
      </div>

      {/* Floating Chat Button */}
      <Link href="/chat?action=create">
        <Button
          className="fixed bottom-8 right-8 z-50 flex flex-col items-center justify-center rounded-full shadow-lg bg-primary text-primary-foreground w-16 h-16 animate-bounce"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        >
          <MessageCircle size={32} />
          <span className="text-xs mt-1 font-semibold">Assistia</span>
        </Button>
      </Link>
    </main>
  )
}
