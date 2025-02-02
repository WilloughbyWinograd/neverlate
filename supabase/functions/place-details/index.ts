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

    // Handle reverse geocoding if lat/lng provided
    if (lat && lng) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      const geocodeRes = await fetch(geocodeUrl)
      const geocodeData = await geocodeRes.json()

      if (geocodeData.results && geocodeData.results[0]) {
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
      const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
      const placeRes = await fetch(placeUrl)
      const placeData = await placeRes.json()

      if (!placeData.results || !placeData.results[0]) {
        throw new Error('Location not found')
      }

      const place = placeData.results[0]
      let travelTime = ''
      let durationInMinutes = 0

      if (origin && mode) {
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(location)}&mode=${mode}&key=${apiKey}`
        const directionsRes = await fetch(directionsUrl)
        const directionsData = await directionsRes.json()

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

    throw new Error('Invalid request parameters')
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})