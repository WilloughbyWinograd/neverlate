import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const GOOGLE_API_KEY = Deno.env.get('Google_API_Key')

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
    if (!GOOGLE_API_KEY) {
      console.error('Google API key not found')
      throw new Error('API key configuration missing')
    }

    const { location, mode = 'driving' } = await req.json()
    
    if (!location) {
      console.error('No location provided')
      throw new Error('Location is required')
    }

    console.log('Fetching place details for location:', location)

    // First get place ID
    const placeSearchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(location)}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`
    
    const placeResponse = await fetch(placeSearchUrl)
    if (!placeResponse.ok) {
      console.error('Google Places API error:', await placeResponse.text())
      throw new Error('Failed to fetch place details')
    }

    const placeData = await placeResponse.json()
    console.log('Place search response:', placeData)

    if (!placeData.candidates || placeData.candidates.length === 0) {
      throw new Error('Location not found')
    }

    const placeId = placeData.candidates[0].place_id
    let photoUrl = null

    // Get photo if available
    if (placeData.candidates[0].photos && placeData.candidates[0].photos.length > 0) {
      const photoReference = placeData.candidates[0].photos[0].photo_reference
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`
    }

    // Get place details including coordinates
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_API_KEY}`
    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()

    console.log('Place details response:', detailsData)

    if (!detailsData.result || !detailsData.result.geometry) {
      throw new Error('Failed to get location coordinates')
    }

    return new Response(
      JSON.stringify({
        placeId,
        photoUrl,
        coordinates: detailsData.result.geometry.location
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in place-details function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while fetching place details'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})