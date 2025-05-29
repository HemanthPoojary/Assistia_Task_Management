import { NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json(
        { error: 'N8N webhook URL not configured' },
        { status: 500 }
      )
    }

    // Trigger n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Failed to trigger n8n webhook: ${response.statusText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error triggering n8n webhook:', error)
    return NextResponse.json(
      { error: 'Failed to trigger n8n webhook' },
      { status: 500 }
    )
  }
} 