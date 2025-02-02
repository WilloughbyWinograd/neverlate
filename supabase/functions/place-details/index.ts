import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TravelInfo {
  travelTime: string;
  durationInMinutes: number;
  timezone?: string;
}

interface PlaceDetails {
  formattedAddress: string;
  photoUrl: string | null;
}

interface ReverseGeocodingResult {
  formattedAddress: string;
}

// Handle CORS preflight requests
const handleOptions = () => {
  return new Response(null, {
    headers: corsHeaders,
  })
}

// Get directions and travel time between two points
const getDirections = async (origin: string, destination: string, mode: string, apiKey: string): Promise<TravelInfo> => {
  console.log('Getting directions:', { origin, destination, mode })
  
  try {
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`
    const directionsRes = await fetch(directionsUrl)
    const directionsData = await directionsRes.json()

    if (directionsData.status === 'REQUEST_DENIED') {
      console.error('Directions API error:', directionsData.error_message)
      throw new Error('Failed to get directions')
    }

    const route = directionsData.routes?.[0]
    const leg = route?.legs?.[0]
    
    if (!leg) {
      throw new Error('No route found')
    }

    return {
      travelTime: leg.duration.text,
      durationInMinutes: Math.ceil(leg.duration.value / 60),
      timezone: route.timezone
    }
  } catch (error) {
    console.error('Error getting directions:', error)
    throw error
  }
}

// Get details for a single place
const getPlaceDetails = async (location: string, apiKey: string): Promise<PlaceDetails> => {
  console.log('Getting place details for location:', location)
  
  try {
    const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
    const placeRes = await fetch(placeUrl)
    const placeData = await placeRes.json()

    if (placeData.status === 'REQUEST_DENIED') {
      console.error('Places API error:', placeData.error_message)
      return {
        formattedAddress: location,
        photoUrl: null
      }
    }

    const place = placeData.results?.[0]
    if (!place) {
      return {
        formattedAddress: location,
        photoUrl: null
      }
    }

    return {
      formattedAddress: place.formatted_address,
      photoUrl: place.photos?.[0] ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
        null
    }
  } catch (error) {
    console.error('Error getting place details:', error)
    throw error
  }
}

// Get travel information and place details
const handlePlaceDetails = async (origin: string, destination: string, mode: string, apiKey: string) => {
  console.log('Handling place details:', { origin, destination, mode })
  
  const travelInfo = await getDirections(origin, destination, mode, apiKey)
  const placeDetails = await getPlaceDetails(destination, apiKey)
  
  return {
    ...placeDetails,
    ...travelInfo
  }
}

// Handle reverse geocoding
const handleReverseGeocoding = async (lat: number, lng: number, apiKey: string): Promise<ReverseGeocodingResult> => {
  console.log('Handling reverse geocoding:', { lat, lng })
  
  try {
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    const geocodingRes = await fetch(geocodingUrl)
    const geocodingData = await geocodingRes.json()

    if (geocodingData.status === 'REQUEST_DENIED') {
      console.error('Geocoding API error:', geocodingData.error_message)
      throw new Error('Failed to get address')
    }

    return {
      formattedAddress: geocodingData.results?.[0]?.formatted_address || `${lat},${lng}`
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error)
    throw error
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      throw new Error('Google API key not found')
    }

    const requestData = await req.json()
    console.log('Received request with data:', requestData)

    const { origin, destination, mode, lat, lng, location } = requestData

    // Handle reverse geocoding request
    if (typeof lat === 'number' && typeof lng === 'number') {
      const result = await handleReverseGeocoding(lat, lng, apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Handle single location request
    if (location) {
      const result = await getPlaceDetails(location, apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Handle directions request
    if (origin && destination) {
      const result = await handlePlaceDetails(origin, destination, mode || 'driving', apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // If we have neither coordinates nor valid origin/destination nor location, return an error
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: 'Either coordinates (lat/lng), a single location, or both origin and destination are required'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})