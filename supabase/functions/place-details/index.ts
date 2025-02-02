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

const handlePlaceDetails = async (location: string, mode: string, origin: string | undefined, apiKey: string) => {
  console.log('Fetching place details for location:', location)
  
  // Try Places API first
  const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
  const placeRes = await fetch(placeUrl)
  const placeData = await placeRes.json()

  // If Places API fails, try Geocoding API
  if (placeData.status === 'REQUEST_DENIED') {
    console.log('Places API failed, trying Geocoding API')
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    const geocodeRes = await fetch(geocodeUrl)
    const geocodeData = await geocodeRes.json()

    if (geocodeData.status === 'REQUEST_DENIED') {
      return {
        formattedAddress: location,
        photoUrl: null,
        travelTime: null,
        durationInMinutes: 0
      }
    }

    const place = geocodeData.results?.[0]
    if (!place) {
      return {
        formattedAddress: location,
        photoUrl: null,
        travelTime: null,
        durationInMinutes: 0
      }
    }

    let travelInfo = { travelTime: null, durationInMinutes: 0 }
    if (origin && mode) {
      travelInfo = await getDirections(origin, place.formatted_address, mode, apiKey)
    }

    return {
      formattedAddress: place.formatted_address,
      photoUrl: null,
      ...travelInfo
    }
  }

  // Use Places API results
  const place = placeData.results?.[0]
  if (!place) {
    return {
      formattedAddress: location,
      photoUrl: null,
      travelTime: null,
      durationInMinutes: 0
    }
  }

  let travelInfo = { travelTime: null, durationInMinutes: 0 }
  if (origin && mode) {
    travelInfo = await getDirections(origin, place.formatted_address, mode, apiKey)
  }

  return {
    formattedAddress: place.formatted_address,
    photoUrl: place.photos?.[0] ? 
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
      null,
    ...travelInfo
  }
}

const getDirections = async (origin: string, destination: string, mode: string, apiKey: string) => {
  try {
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`
    const directionsRes = await fetch(directionsUrl)
    const directionsData = await directionsRes.json()

    if (directionsData.routes?.[0]?.legs?.[0]) {
      const leg = directionsData.routes[0].legs[0]
      return {
        travelTime: leg.duration.text,
        durationInMinutes: Math.ceil(leg.duration.value / 60)
      }
    }
  } catch (error) {
    console.error('Error fetching directions:', error)
  }
  return { travelTime: null, durationInMinutes: 0 }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      throw new Error('Google API key not configured')
    }

    const { location, mode, origin, lat, lng } = await req.json()
    console.log('Received request with params:', { location, mode, origin, lat, lng })

    if (!location && (!lat || !lng)) {
      throw new Error('Invalid request parameters')
    }

    const result = lat && lng 
      ? await handleReverseGeocoding(lat, lng, apiKey)
      : await handlePlaceDetails(location, mode, origin, apiKey)

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