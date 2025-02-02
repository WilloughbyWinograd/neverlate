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
      try {
        console.log('Performing reverse geocoding for coordinates:', { lat, lng })
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        const geocodeRes = await fetch(geocodeUrl)
        const geocodeData = await geocodeRes.json()

        if (geocodeData.status === 'REQUEST_DENIED') {
          console.error('Geocoding API error:', geocodeData.error_message)
          return new Response(
            JSON.stringify({
              error: 'Google API authorization error',
              details: 'Please verify your Google Cloud Console setup:\n' +
                      '1. Enable the Geocoding API\n' +
                      '2. Ensure billing is enabled\n' +
                      '3. Check API key restrictions'
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        if (!geocodeData.results || !geocodeData.results[0]) {
          return new Response(
            JSON.stringify({
              formattedAddress: "Current Location",
              error: "Could not determine exact address"
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            formattedAddress: geocodeData.results[0].formatted_address,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Error in reverse geocoding:', error)
        return new Response(
          JSON.stringify({
            formattedAddress: "Current Location",
            error: "Failed to get location details"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Handle place details and directions
    if (location) {
      try {
        console.log('Fetching place details for location:', location)
        
        // First try Places API
        const placeUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(location)}&key=${apiKey}`
        const placeRes = await fetch(placeUrl)
        const placeData = await placeRes.json()

        console.log('Place API response status:', placeData.status)

        if (placeData.status === 'REQUEST_DENIED') {
          // Try fallback to Geocoding API
          console.log('Places API failed, trying Geocoding API as fallback')
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
          const geocodeRes = await fetch(geocodeUrl)
          const geocodeData = await geocodeRes.json()

          if (geocodeData.status === 'REQUEST_DENIED') {
            return new Response(
              JSON.stringify({
                error: 'Google API authorization error',
                details: 'Please verify your Google Cloud Console setup:\n' +
                        '1. Enable the Places API and Geocoding API\n' +
                        '2. Ensure billing is enabled\n' +
                        '3. Check API key restrictions'
              }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          if (!geocodeData.results || !geocodeData.results[0]) {
            return new Response(
              JSON.stringify({
                error: `Location not found: ${location}`,
                formattedAddress: location,
                photoUrl: null,
                travelTime: null,
                durationInMinutes: 0
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const place = geocodeData.results[0]
          let travelTime = null
          let durationInMinutes = 0

          if (origin && mode) {
            try {
              const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(place.formatted_address)}&mode=${mode}&key=${apiKey}`
              const directionsRes = await fetch(directionsUrl)
              const directionsData = await directionsRes.json()

              if (directionsData.routes && directionsData.routes[0]) {
                const leg = directionsData.routes[0].legs[0]
                travelTime = leg.duration.text
                durationInMinutes = Math.ceil(leg.duration.value / 60)
              }
            } catch (error) {
              console.error('Error fetching directions:', error)
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

        // Use Places API results if available
        if (placeData.results && placeData.results.length > 0) {
          const place = placeData.results[0]
          let travelTime = null
          let durationInMinutes = 0

          if (origin && mode) {
            try {
              const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(place.formatted_address)}&mode=${mode}&key=${apiKey}`
              const directionsRes = await fetch(directionsUrl)
              const directionsData = await directionsRes.json()

              if (directionsData.routes && directionsData.routes[0]) {
                const leg = directionsData.routes[0].legs[0]
                travelTime = leg.duration.text
                durationInMinutes = Math.ceil(leg.duration.value / 60)
              }
            } catch (error) {
              console.error('Error fetching directions:', error)
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

        // If no results from either API
        return new Response(
          JSON.stringify({
            error: `Location not found: ${location}`,
            formattedAddress: location,
            photoUrl: null,
            travelTime: null,
            durationInMinutes: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Error in place details:', error)
        return new Response(
          JSON.stringify({
            error: 'Failed to get place details',
            formattedAddress: location,
            photoUrl: null,
            travelTime: null,
            durationInMinutes: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    throw new Error('Invalid request parameters')
  } catch (error) {
    console.error('Error in place-details function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Please verify your Google Cloud Console setup:\n' +
                '1. Enable the Places API\n' +
                '2. Enable the Geocoding API\n' +
                '3. Enable the Directions API\n' +
                '4. Ensure billing is enabled\n' +
                '5. Check API key restrictions'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})