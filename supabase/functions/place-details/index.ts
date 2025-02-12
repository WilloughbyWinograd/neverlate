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

const handleOptions = () => {
  return new Response(null, { headers: corsHeaders })
}

const getDirections = async (origin: string, destination: string, mode: string, apiKey: string): Promise<TravelInfo> => {
  console.log('Getting directions:', { origin, destination, mode })
  
  try {
    // Validate addresses before making the API call
    if (!origin.trim() || !destination.trim()) {
      throw new Error('Invalid origin or destination address')
    }

    const encodedOrigin = encodeURIComponent(origin)
    const encodedDestination = encodeURIComponent(destination)
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodedOrigin}&destination=${encodedDestination}&mode=${mode}&key=${apiKey}`
    
    console.log('Calling Google Directions API...')
    const directionsRes = await fetch(directionsUrl)
    const directionsData = await directionsRes.json()

    console.log('Google Directions API response:', {
      status: directionsData.status,
      error_message: directionsData.error_message || 'No error message',
      origin,
      destination
    })

    if (directionsData.status === 'NOT_FOUND') {
      throw new Error('Could not find a route between these locations. Please check the addresses and try again.')
    }

    if (directionsData.status !== 'OK') {
      throw new Error(`Directions API error: ${directionsData.status}${directionsData.error_message ? ` - ${directionsData.error_message}` : ''}`)
    }

    const route = directionsData.routes?.[0]
    const leg = route?.legs?.[0]
    
    if (!leg) {
      throw new Error('No route found between these locations')
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

const getPlaceDetails = async (location: string, apiKey: string): Promise<PlaceDetails> => {
  console.log('Getting place details for location:', location)
  
  try {
    const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
    
    console.log('Calling Google Places API...')
    const placeRes = await fetch(placeUrl)
    const placeData = await placeRes.json()

    console.log('Google Places API response status:', placeData.status)

    if (placeData.status !== 'OK') {
      console.error('Places API error:', placeData.status, placeData.error_message)
      return {
        formattedAddress: location,
        photoUrl: null
      }
    }

    const place = placeData.results?.[0]
    if (!place) {
      console.log('No place found, returning original location')
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
    return {
      formattedAddress: location,
      photoUrl: null
    }
  }
}

const handlePlaceDetails = async (origin: string, destination: string, mode: string, apiKey: string) => {
  console.log('Handling place details:', { origin, destination, mode })
  
  try {
    const travelInfo = await getDirections(origin, destination, mode, apiKey)
    const placeDetails = await getPlaceDetails(destination, apiKey)
    
    return {
      ...placeDetails,
      ...travelInfo
    }
  } catch (error) {
    console.error('Error in handlePlaceDetails:', error)
    throw error
  }
}

const handleReverseGeocoding = async (lat: number, lng: number, apiKey: string): Promise<ReverseGeocodingResult> => {
  console.log('Handling reverse geocoding:', { lat, lng })
  
  try {
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    console.log('Calling Google Geocoding API...')
    const geocodingRes = await fetch(geocodingUrl)
    const geocodingData = await geocodingRes.json()

    console.log('Geocoding API response status:', geocodingData.status)

    if (geocodingData.status !== 'OK') {
      throw new Error(`Geocoding API error: ${geocodingData.status}${geocodingData.error_message ? ` - ${geocodingData.error_message}` : ''}`)
    }

    return {
      formattedAddress: geocodingData.results?.[0]?.formatted_address || `${lat},${lng}`
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleOptions()
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      console.error('Google API key not found')
      throw new Error('Google API key not found in environment variables')
    }

    console.log('Successfully retrieved Google API key')

    const requestData = await req.json()
    console.log('Received request with data:', requestData)

    const { origin, destination, mode, lat, lng, location } = requestData

    if (typeof lat === 'number' && typeof lng === 'number') {
      const result = await handleReverseGeocoding(lat, lng, apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (location) {
      const result = await getPlaceDetails(location, apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (origin && destination) {
      const result = await handlePlaceDetails(origin, destination, mode || 'driving', apiKey)
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(
      JSON.stringify({ 
        error: 'Invalid request',
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