// api/weather.cjs
const axios = require('axios');

module.exports = async function handler(req, res) {
    // ✅ Enhanced CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache for preflight
    
    // ✅ Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Get city from query parameters (default: London)
    const city = req.query.city || 'London';
    
    // Validate city parameter
    if (!city || city.trim() === '') {
        return res.status(400).json({ 
            error: 'City parameter is required' 
        });
    }

    console.log(`📡 Fetching weather for: ${city}`);

    try {
        // Step 1: Get coordinates from Geocoding API
        const geoResponse = await axios.get(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
        );

        if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
            return res.status(404).json({ 
                error: 'City not found. Please enter a valid city name.' 
            });
        }

        const location = geoResponse.data.results[0];
        const { latitude, longitude, name, country, timezone } = location;

        console.log(`📍 Found: ${name}, ${country} (${latitude}, ${longitude})`);

        // Step 2: Get weather data from Open-Meteo
        const weatherResponse = await axios.get(
            `https://api.open-meteo.com/v1/forecast`,
            {
                params: {
                    latitude: latitude,
                    longitude: longitude,
                    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,cloud_cover',
                    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,weather_code',
                    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                    timezone: timezone || 'auto',
                    forecast_days: 7
                }
            }
        );

        // Step 3: Format the response to match your frontend expectations
        const formattedData = {
            location: {
                name: name,
                country: country,
                lat: latitude,
                lon: longitude,
                timezone: timezone || 'auto'
            },
            current: {
                temp_c: weatherResponse.data.current?.temperature_2m,
                temp_f: weatherResponse.data.current?.temperature_2m ? 
                    (weatherResponse.data.current.temperature_2m * 9/5 + 32) : null,
                condition: mapWeatherCode(weatherResponse.data.current?.weather_code),
                humidity: weatherResponse.data.current?.relative_humidity_2m,
                feelslike_c: weatherResponse.data.current?.apparent_temperature,
                feelslike_f: weatherResponse.data.current?.apparent_temperature ? 
                    (weatherResponse.data.current.apparent_temperature * 9/5 + 32) : null,
                wind_kph: weatherResponse.data.current?.wind_speed_10m ? 
                    (weatherResponse.data.current.wind_speed_10m * 3.6) : null,
                cloud: weatherResponse.data.current?.cloud_cover,
                precip_mm: weatherResponse.data.current?.precipitation
            },
            forecast: {
                forecastday: weatherResponse.data.daily?.time?.map((date, index) => ({
                    date: date,
                    day: {
                        maxtemp_c: weatherResponse.data.daily?.temperature_2m_max?.[index],
                        maxtemp_f: weatherResponse.data.daily?.temperature_2m_max?.[index] ? 
                            (weatherResponse.data.daily.temperature_2m_max[index] * 9/5 + 32) : null,
                        mintemp_c: weatherResponse.data.daily?.temperature_2m_min?.[index],
                        mintemp_f: weatherResponse.data.daily?.temperature_2m_min?.[index] ? 
                            (weatherResponse.data.daily.temperature_2m_min[index] * 9/5 + 32) : null,
                        condition: mapWeatherCode(weatherResponse.data.daily?.weather_code?.[index]),
                        daily_chance_of_rain: weatherResponse.data.daily?.precipitation_probability_max?.[index]
                    }
                })) || []
            }
        };

        res.status(200).json(formattedData);
        
    } catch (error) {
        console.error('❌ Weather API Error:', error.message);
        
        if (error.response) {
            return res.status(error.response.status || 500).json({ 
                error: 'Weather API error: ' + (error.response.data?.error || error.message)
            });
        } else if (error.request) {
            return res.status(503).json({ 
                error: 'Weather service is currently unavailable. Please try again later.' 
            });
        } else {
            return res.status(500).json({ 
                error: 'Failed to fetch weather data. Please try again.' 
            });
        }
    }
};

// Helper function to map WMO weather codes to WeatherAPI-like conditions
function mapWeatherCode(code) {
    const weatherCodes = {
        0: { text: 'Clear', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' },
        1: { text: 'Clear', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' },
        2: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/weather/64x64/day/116.png' },
        3: { text: 'Overcast', icon: '//cdn.weatherapi.com/weather/64x64/day/119.png' },
        45: { text: 'Fog', icon: '//cdn.weatherapi.com/weather/64x64/day/248.png' },
        48: { text: 'Fog', icon: '//cdn.weatherapi.com/weather/64x64/day/248.png' },
        51: { text: 'Light drizzle', icon: '//cdn.weatherapi.com/weather/64x64/day/263.png' },
        53: { text: 'Moderate drizzle', icon: '//cdn.weatherapi.com/weather/64x64/day/263.png' },
        55: { text: 'Heavy drizzle', icon: '//cdn.weatherapi.com/weather/64x64/day/263.png' },
        56: { text: 'Light freezing drizzle', icon: '//cdn.weatherapi.com/weather/64x64/day/263.png' },
        57: { text: 'Heavy freezing drizzle', icon: '//cdn.weatherapi.com/weather/64x64/day/263.png' },
        61: { text: 'Light rain', icon: '//cdn.weatherapi.com/weather/64x64/day/296.png' },
        63: { text: 'Moderate rain', icon: '//cdn.weatherapi.com/weather/64x64/day/299.png' },
        65: { text: 'Heavy rain', icon: '//cdn.weatherapi.com/weather/64x64/day/308.png' },
        66: { text: 'Light freezing rain', icon: '//cdn.weatherapi.com/weather/64x64/day/311.png' },
        67: { text: 'Heavy freezing rain', icon: '//cdn.weatherapi.com/weather/64x64/day/311.png' },
        71: { text: 'Light snow', icon: '//cdn.weatherapi.com/weather/64x64/day/323.png' },
        73: { text: 'Moderate snow', icon: '//cdn.weatherapi.com/weather/64x64/day/326.png' },
        75: { text: 'Heavy snow', icon: '//cdn.weatherapi.com/weather/64x64/day/329.png' },
        77: { text: 'Snow grains', icon: '//cdn.weatherapi.com/weather/64x64/day/329.png' },
        80: { text: 'Light rain showers', icon: '//cdn.weatherapi.com/weather/64x64/day/296.png' },
        81: { text: 'Moderate rain showers', icon: '//cdn.weatherapi.com/weather/64x64/day/299.png' },
        82: { text: 'Heavy rain showers', icon: '//cdn.weatherapi.com/weather/64x64/day/308.png' },
        85: { text: 'Light snow showers', icon: '//cdn.weatherapi.com/weather/64x64/day/323.png' },
        86: { text: 'Heavy snow showers', icon: '//cdn.weatherapi.com/weather/64x64/day/329.png' },
        95: { text: 'Thunderstorm', icon: '//cdn.weatherapi.com/weather/64x64/day/386.png' },
        96: { text: 'Thunderstorm with hail', icon: '//cdn.weatherapi.com/weather/64x64/day/386.png' },
        99: { text: 'Thunderstorm with heavy hail', icon: '//cdn.weatherapi.com/weather/64x64/day/386.png' }
    };
    
    return weatherCodes[code] || { text: 'Unknown', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png' };
}
