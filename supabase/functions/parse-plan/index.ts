import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const CLAUDE_API_KEY = Deno.env.get('Claude_API_Key')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!CLAUDE_API_KEY) {
      console.error('Claude API key not found')
      throw new Error('API key configuration missing')
    }

    const { planText } = await req.json()
    
    if (!planText) {
      console.error('No plan text provided')
      throw new Error('Plan text is required')
    }

    console.log('Sending request to Claude API with plan:', planText)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Parse this daily plan into structured events. Return ONLY a JSON array of objects with these exact fields:
          - activity (string)
          - location (string)
          - startTime (ISO string)
          - endTime (ISO string, estimate 1 hour duration if not specified)
          
          Plan text: ${planText}
          
          Important: Return ONLY the JSON array, no other text or explanation.`
        }]
      })
    })

    if (!response.ok) {
      console.error('Claude API error:', await response.text())
      throw new Error('Failed to parse plan with Claude API')
    }

    const data = await response.json()
    console.log('Claude API response:', data)

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from Claude API')
    }

    // Extract JSON from Claude's response and parse it
    const jsonMatch = data.content[0].text.match(/\[.*\]/s)
    if (!jsonMatch) {
      console.error('No JSON array found in Claude response:', data.content[0].text)
      throw new Error('Failed to extract events from Claude response')
    }

    const events = JSON.parse(jsonMatch[0])
    console.log('Parsed events:', events)

    if (!Array.isArray(events)) {
      throw new Error('Invalid events format - expected array')
    }

    // Validate each event has required fields
    events.forEach((event, index) => {
      if (!event.activity || !event.location || !event.startTime || !event.endTime) {
        console.error('Invalid event format:', event)
        throw new Error(`Event at index ${index} is missing required fields`)
      }
    })

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in parse-plan function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing your plan'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})