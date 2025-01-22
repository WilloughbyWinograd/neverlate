import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const GOOGLE_API_KEY = Deno.env.get('Google_API_Key')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { location, mode } = await req.json()

    // First, get place details including photo reference
    const placeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(location)}&inputtype=textquery&fields=photos,place_id&key=${GOOGLE_API_KEY}`
    )
    const placeData = await placeResponse.json()

    // Get travel time using Distance Matrix API
    const originLocation = await getCurrentLocation() // You'll need to implement this
    const distanceResponse = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLocation}&destinations=${encodeURIComponent(location)}&mode=${mode}&key=${GOOGLE_API_KEY}`
    )
    const distanceData = await distanceResponse.json()

    // Get place photo if available
    let photoUrl = '/placeholder.svg'
    if (placeData.candidates[0]?.photos?.[0]) {
      const photoRef = placeData.candidates[0].photos[0].photo_reference
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_API_KEY}`
    }

    return new Response(JSON.stringify({
      travelTime: distanceData.rows[0].elements[0].duration.text,
      photoUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Helper function to get current location (you'll need to implement this based on your needs)
async function getCurrentLocation() {
  // For demo purposes, returning a fixed location
  // In production, you might want to get this from the user's browser or a stored preference
  return '40.7128,-74.0060' // New York City coordinates
}