import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { location, mode, origin, lat, lng } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_API_KEY')

    if (!apiKey) {
      throw new Error('Google API key not configured')
    }

    console.log('Received request with params:', { location, mode, origin, lat, lng })

    // Handle reverse geocoding if lat/lng provided
    if (lat && lng) {
      console.log('Reverse geocoding for coordinates:', { lat, lng })
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      const geocodeRes = await fetch(geocodeUrl)
      const geocodeData = await geocodeRes.json()

      console.log('Geocode response:', geocodeData)

      if (geocodeData.status === 'REQUEST_DENIED') {
        throw new Error(`Google API error: ${geocodeData.error_message || 'Request denied'}`)
      }

      if (geocodeData.results && geocodeData.results[0]) {
        console.log('Successfully got address from coordinates')
        return new Response(
          JSON.stringify({
            formattedAddress: geocodeData.results[0].formatted_address,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Handle place details and directions
    if (location) {
      console.log('Getting place details for location:', location)
      const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
      const placeRes = await fetch(placeUrl)
      const placeData = await placeRes.json()

      console.log('Place API response:', placeData)

      if (placeData.status === 'REQUEST_DENIED') {
        throw new Error(`Google API error: ${placeData.error_message || 'Request denied'}`)
      }

      if (!placeData.results || !placeData.results[0]) {
        throw new Error(`Location not found: ${location}`)
      }

      const place = placeData.results[0]
      let travelTime = ''
      let durationInMinutes = 0

      if (origin && mode) {
        console.log('Calculating travel time from', origin, 'to', location)
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(location)}&mode=${mode}&key=${apiKey}`
        const directionsRes = await fetch(directionsUrl)
        const directionsData = await directionsRes.json()

        console.log('Directions API response:', directionsData)

        if (directionsData.status === 'REQUEST_DENIED') {
          throw new Error(`Google API error: ${directionsData.error_message || 'Request denied'}`)
        }

        if (directionsData.routes && directionsData.routes[0]) {
          const leg = directionsData.routes[0].legs[0]
          travelTime = leg.duration.text
          durationInMinutes = Math.ceil(leg.duration.value / 60)
        }
      }

      // Get timezone
      const timezoneUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${place.geometry.location.lat},${place.geometry.location.lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${apiKey}`
      const timezoneRes = await fetch(timezoneUrl)
      const timezoneData = await timezoneRes.json()

      if (timezoneData.status === 'REQUEST_DENIED') {
        throw new Error(`Google API error: ${timezoneData.error_message || 'Request denied'}`)
      }

      console.log('Successfully got place details and related data')
      return new Response(
        JSON.stringify({
          placeId: place.place_id,
          formattedAddress: place.formatted_address,
          photoUrl: place.photos?.[0] ? 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
            null,
          timezone: timezoneData.timeZoneId,
          travelTime,
          durationInMinutes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid request parameters: requires either location or lat/lng coordinates')
  } catch (error) {
    console.error('Error in place-details function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please provide either location or lat/lng coordinates'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})