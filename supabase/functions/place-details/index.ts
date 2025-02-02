import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const handleReverseGeocoding = async (lat: number, lng: number, apiKey: string) => {
  console.log('Performing reverse geocoding for coordinates:', { lat, lng })
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
  const geocodeRes = await fetch(geocodeUrl)
  const geocodeData = await geocodeRes.json()

  if (geocodeData.status === 'REQUEST_DENIED') {
    console.error('Geocoding API error:', geocodeData.error_message)
    return { formattedAddress: "Current Location" }
  }

  return {
    formattedAddress: geocodeData.results?.[0]?.formatted_address || "Current Location"
  }
}

const getDirections = async (origin: string, destination: string, mode: string, apiKey: string) => {
  console.log('Fetching directions:', { origin, destination, mode })
  
  // Validate input parameters
  if (!origin?.trim() || !destination?.trim()) {
    throw new Error('Origin and destination are required and must not be empty')
  }

  try {
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin.trim())}&destination=${encodeURIComponent(destination.trim())}&mode=${mode}&key=${apiKey}`
    const directionsRes = await fetch(directionsUrl)
    const directionsData = await directionsRes.json()

    if (directionsData.status === 'REQUEST_DENIED') {
      console.error('Directions API error:', directionsData.error_message)
      throw new Error(directionsData.error_message)
    }

    if (!directionsData.routes?.[0]?.legs?.[0]) {
      console.error('No route found for:', { origin, destination, mode })
      throw new Error('No route found between these locations')
    }

    const leg = directionsData.routes[0].legs[0]
    return {
      travelTime: leg.duration.text,
      durationInMinutes: Math.ceil(leg.duration.value / 60)
    }
  } catch (error) {
    console.error('Error fetching directions:', error)
    throw error
  }
}

const handlePlaceDetails = async (origin: string, destination: string, mode: string, apiKey: string) => {
  console.log('Handling place details:', { origin, destination, mode })
  
  // Get travel time first
  const travelInfo = await getDirections(origin, destination, mode, apiKey)
  
  // Get place details for the destination
  const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(destination)}&key=${apiKey}`
  const placeRes = await fetch(placeUrl)
  const placeData = await placeRes.json()

  if (placeData.status === 'REQUEST_DENIED') {
    console.error('Places API error:', placeData.error_message)
    return {
      formattedAddress: destination,
      photoUrl: null,
      ...travelInfo
    }
  }

  const place = placeData.results?.[0]
  if (!place) {
    return {
      formattedAddress: destination,
      photoUrl: null,
      ...travelInfo
    }
  }

  return {
    formattedAddress: place.formatted_address,
    photoUrl: place.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
      null,
    ...travelInfo
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      throw new Error('Google API key not configured')
    }

    const { origin, destination, mode, lat, lng } = await req.json()
    console.log('Received request with params:', { origin, destination, mode, lat, lng })

    // Handle reverse geocoding request
    if (typeof lat === 'number' && typeof lng === 'number') {
      const result = await handleReverseGeocoding(lat, lng, apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Handle directions/place details request
    if (!origin?.trim() || !destination?.trim()) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process request',
          details: 'Origin and destination are required and must not be empty'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await handlePlaceDetails(origin, destination, mode || 'driving', apiKey)
    return new Response(JSON.stringify(result), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Error in place-details function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})