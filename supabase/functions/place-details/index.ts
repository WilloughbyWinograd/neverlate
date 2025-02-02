import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      console.error('Google API key not configured')
      throw new Error('Google API key not configured')
    }

    const { location, mode, origin, lat, lng } = await req.json()
    console.log('Received request with params:', { location, mode, origin, lat, lng })

    // Validate that we have either location or coordinates
    if (!location && (!lat || !lng)) {
      throw new Error('Invalid request parameters: requires either location or lat/lng coordinates')
    }

    // Handle reverse geocoding if lat/lng provided
    if (lat && lng) {
      console.log('Performing reverse geocoding for coordinates:', { lat, lng })
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      const geocodeRes = await fetch(geocodeUrl)
      const geocodeData = await geocodeRes.json()

      if (geocodeData.status === 'REQUEST_DENIED') {
        console.error('Geocoding API error:', geocodeData.error_message)
        throw new Error('Geocoding API error: ' + geocodeData.error_message)
      }

      if (!geocodeData.results || !geocodeData.results[0]) {
        throw new Error('No results found for these coordinates')
      }

      return new Response(
        JSON.stringify({
          formattedAddress: geocodeData.results[0].formatted_address,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle place details and directions
    if (location) {
      console.log('Fetching place details for location:', location)
      
      // First try to get a more specific place ID using Places API Text Search
      const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
      const placeRes = await fetch(placeUrl)
      const placeData = await placeRes.json()

      console.log('Place API response status:', placeData.status)

      if (placeData.status === 'REQUEST_DENIED') {
        console.error('Places API error:', placeData.error_message)
        throw new Error('Places API error: ' + placeData.error_message)
      }

      if (!placeData.results || placeData.results.length === 0) {
        // If no results from Places API, try Geocoding API as fallback
        console.log('No results from Places API, trying Geocoding API')
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
        const geocodeRes = await fetch(geocodeUrl)
        const geocodeData = await geocodeRes.json()

        if (geocodeData.status === 'REQUEST_DENIED') {
          console.error('Geocoding API error:', geocodeData.error_message)
          throw new Error('Geocoding API error: ' + geocodeData.error_message)
        }

        if (!geocodeData.results || !geocodeData.results[0]) {
          throw new Error(`Location not found: ${location}`)
        }

        const place = geocodeData.results[0]
        let travelTime = null
        let durationInMinutes = 0

        if (origin && mode) {
          const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(place.formatted_address)}&mode=${mode}&key=${apiKey}`
          const directionsRes = await fetch(directionsUrl)
          const directionsData = await directionsRes.json()

          if (directionsData.routes && directionsData.routes[0]) {
            const leg = directionsData.routes[0].legs[0]
            travelTime = leg.duration.text
            durationInMinutes = Math.ceil(leg.duration.value / 60)
          }
        }

        return new Response(
          JSON.stringify({
            placeId: place.place_id,
            formattedAddress: place.formatted_address,
            photoUrl: null,
            travelTime,
            durationInMinutes,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Use the first result from Places API
      const place = placeData.results[0]
      let travelTime = null
      let durationInMinutes = 0

      if (origin && mode) {
        console.log('Calculating travel time from', origin, 'to', location)
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(place.formatted_address)}&mode=${mode}&key=${apiKey}`
        const directionsRes = await fetch(directionsUrl)
        const directionsData = await directionsRes.json()

        if (directionsData.status === 'REQUEST_DENIED') {
          console.error('Directions API error:', directionsData.error_message)
          throw new Error('Directions API error: ' + directionsData.error_message)
        }

        if (directionsData.routes && directionsData.routes[0]) {
          const leg = directionsData.routes[0].legs[0]
          travelTime = leg.duration.text
          durationInMinutes = Math.ceil(leg.duration.value / 60)
        }
      }

      return new Response(
        JSON.stringify({
          placeId: place.place_id,
          formattedAddress: place.formatted_address,
          photoUrl: place.photos?.[0] ? 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
            null,
          travelTime,
          durationInMinutes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid request parameters')
  } catch (error) {
    console.error('Error in place-details function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please enable the following APIs in your Google Cloud Console:\n' +
                '1. Geocoding API\n' +
                '2. Places API\n' +
                '3. Directions API'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})