import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const CLAUDE_API_KEY = Deno.env.get('Claude_API_Key')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
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

    // Parse request body
    let body;
    try {
      body = await req.json()
    } catch (error) {
      console.error('Error parsing request body:', error)
      throw new Error('Invalid request body')
    }

    const { planText } = body
    
    if (!planText) {
      console.error('No plan text provided')
      throw new Error('Plan text is required')
    }

    console.log('Sending validation request to Claude API with plan:', planText)

    // First, validate if the input contains valid location-based activities
    try {
      const validationResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': CLAUDE_API_KEY,
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Analyze if this text contains valid location-based activities that could be scheduled:

            "${planText}"

            Respond with ONLY "true" if it contains valid location-based activities (e.g., "meeting at coffee shop", "lunch at restaurant", "visit museum"), 
            or "false" if it's gibberish or doesn't contain any location-based activities.
            
            Response must be exactly "true" or "false", nothing else.`
          }]
        })
      });

      if (!validationResponse.ok) {
        throw new Error('Failed to validate plan text')
      }

      const validationData = await validationResponse.json()
      const isValid = validationData.content[0].text.trim().toLowerCase() === 'true'

      if (!isValid) {
        console.log('Input contains no valid schedule:', planText)
        return new Response(
          JSON.stringify({ error: 'No schedule discernible' }), 
          { headers: corsHeaders }
        )
      }
    } catch (validationError) {
      console.error('Validation error:', validationError)
      throw new Error('Failed to validate plan text')
    }

    // If validation passes, proceed with parsing the schedule
    console.log('Input validated, proceeding to parse schedule')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': CLAUDE_API_KEY,
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Parse this daily plan into structured events. For each event:
            1. Create a simplified activity title by:
               - Removing location names from the activity
               - Using concise action verbs (e.g., "Get lunch" instead of "Get lunch at Restaurant X")
               - Keeping only the core activity description
            2. Store the full location separately
            
            Return ONLY a JSON array of objects with these exact fields:
            - activity (string, simplified title)
            - location (string, full location name)
            - startTime (string, in format "HH:mm" like "14:00" or "09:30")
            - endTime (string, in format "HH:mm", estimate 1 hour duration if not specified)
            
            Plan text: ${planText}
            
            Example transformations:
            "Take the cable car to Ghirardelli Square for chocolate sampling" → activity: "Sample chocolate"
            "Get lunch at House of Prime Rib" → activity: "Get lunch"
            "Visit Golden Gate Bridge for photos" → activity: "Take photos"
            
            Important: Return ONLY the JSON array, no other text or explanation.`
          }]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Claude API error response:', errorText)
        throw new Error(`Claude API returned status ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log('Claude API response:', data)

      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Invalid Claude API response structure:', data)
        throw new Error('Invalid response structure from Claude API')
      }

      // Extract JSON from Claude's response and parse it
      const jsonMatch = data.content[0].text.match(/\[.*\]/s)
      if (!jsonMatch) {
        console.error('No JSON array found in Claude response:', data.content[0].text)
        throw new Error('Failed to extract events from Claude response')
      }

      let events;
      try {
        events = JSON.parse(jsonMatch[0])
        console.log('Parsed events:', events)
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw text:', jsonMatch[0])
        throw new Error('Failed to parse events JSON')
      }

      if (!Array.isArray(events)) {
        console.error('Invalid events format - expected array, got:', typeof events)
        throw new Error('Invalid events format - expected array')
      }

      // Validate each event has required fields
      events.forEach((event, index) => {
        if (!event.activity || !event.location || !event.startTime || !event.endTime) {
          console.error('Invalid event format:', event)
          throw new Error(`Event at index ${index} is missing required fields`)
        }
      })

      return new Response(
        JSON.stringify({ events }), 
        { 
          headers: corsHeaders,
          status: 200 
        }
      )

    } catch (apiError) {
      console.error('Error calling Claude API:', apiError)
      throw apiError
    }

  } catch (error) {
    console.error('Error in parse-plan function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing your plan',
        details: error.stack
      }),
      {
        status: 400,
        headers: corsHeaders
      }
    )
  }
})