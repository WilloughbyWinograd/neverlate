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
    
    if (!location || typeof location !== 'string' || location.trim() === '') {
      console.error('Invalid or empty location provided:', location)
      return new Response(
        JSON.stringify({ error: 'Valid location is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Fetching place details for location:', location)

    // First get place ID and coordinates
    const placeSearchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(location.trim())}&inputtype=textquery&fields=place_id,photos,geometry&key=${GOOGLE_API_KEY}`
    
    const placeResponse = await fetch(placeSearchUrl)
    if (!placeResponse.ok) {
      console.error('Google Places API error:', await placeResponse.text())
      throw new Error('Failed to fetch place details')
    }

    const placeData = await placeResponse.json()
    console.log('Place search response:', placeData)

    if (!placeData.candidates || placeData.candidates.length === 0) {
      console.error('No place found for location:', location)
      return new Response(
        JSON.stringify({ error: 'Location not found in Google Places' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const placeId = placeData.candidates[0].place_id
    let photoUrl = null

    // Get photo if available
    if (placeData.candidates[0].photos && placeData.candidates[0].photos.length > 0) {
      const photoReference = placeData.candidates[0].photos[0].photo_reference
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`
    } else {
      photoUrl = '/placeholder.svg'
    }

    // Get coordinates for Distance Matrix API
    const coordinates = placeData.candidates[0].geometry.location

    // Get current user location (for demo, using a fixed point in the city)
    const origin = "37.7749,-122.4194" // San Francisco coordinates
    const destination = `${coordinates.lat},${coordinates.lng}`

    // Calculate travel time using Distance Matrix API
    const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=${mode}&key=${GOOGLE_API_KEY}`
    
    const distanceResponse = await fetch(distanceMatrixUrl)
    if (!distanceResponse.ok) {
      console.error('Distance Matrix API error:', await distanceResponse.text())
      throw new Error('Failed to calculate travel time')
    }

    const distanceData = await distanceResponse.json()
    console.log('Distance Matrix response:', distanceData)

    let travelTime = 'Unable to calculate'
    if (distanceData.rows && 
        distanceData.rows[0].elements && 
        distanceData.rows[0].elements[0].duration) {
      travelTime = distanceData.rows[0].elements[0].duration.text
    }

    return new Response(
      JSON.stringify({
        placeId,
        photoUrl,
        coordinates,
        travelTime
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})