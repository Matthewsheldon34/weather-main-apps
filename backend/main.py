from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests
from datetime import datetime
import sys

# Load .env file - make sure it's loaded before anything else
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# Also try loading from current directory
load_dotenv()

app = FastAPI(
    title="Weather API",
    description="Weather backend service using Open-Meteo API",
    version="2.0.0"
)

# ✅ CORS Configuration - Allow GitHub Pages and local development
ALLOWED_ORIGINS = [
    "https://matthewsheldon34.github.io",
    "https://matthewnp.github.io",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Open-Meteo API endpoints
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

@app.get("/")
async def read_root():
    """Root endpoint - health check"""
    return {
        "message": "Backend is working 🚀",
        "status": "online",
        "service": "weather-api",
        "environment": "production" if os.getenv("RENDER") else "development",
        "timestamp": datetime.now().isoformat(),
        "api_type": "Open-Meteo (No API Key Required)"
    }

@app.get("/weather")
async def get_weather(city: str = Query("London", description="City name to get weather for")):
    """
    Get 7-day weather forecast for a city using Open-Meteo API
    - **city**: City name (e.g., 'London', 'New York', 'Kampala')
    """
    if not city or city.strip() == "":
        return {
            "error": "City parameter is required",
            "message": "Please provide a valid city name"
        }

    try:
        # Step 1: Get coordinates from Geocoding API
        geo_response = requests.get(
            GEOCODING_URL,
            params={
                "name": city.strip(),
                "count": 1,
                "language": "en",
                "format": "json"
            },
            timeout=10
        )
        geo_response.raise_for_status()
        geo_data = geo_response.json()

        if not geo_data.get("results") or len(geo_data["results"]) == 0:
            return {
                "error": "City not found",
                "message": f"Could not find location data for '{city}'. Please enter a valid city name."
            }

        location = geo_data["results"][0]
        latitude = location["latitude"]
        longitude = location["longitude"]
        city_name = location.get("name", city)
        country = location.get("country", "")
        timezone = location.get("timezone", "auto")

        # Step 2: Get weather data from Open-Meteo
        weather_response = requests.get(
            WEATHER_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,cloud_cover",
                "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": timezone,
                "forecast_days": 7
            },
            timeout=10
        )
        weather_response.raise_for_status()
        weather_data = weather_response.json()

        # Step 3: Format the response to match your frontend expectations
        formatted_data = format_weather_data(weather_data, city_name, country, latitude, longitude, timezone)
        
        return formatted_data

    except requests.exceptions.HTTPError as e:
        if hasattr(e.response, 'status_code'):
            if e.response.status_code == 400:
                return {
                    "error": "City not found",
                    "message": f"Could not find weather data for '{city}'. Please enter a valid city name."
                }
            elif e.response.status_code == 429:
                return {
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later."
                }
        return {
            "error": "Weather API error",
            "message": f"HTTP Error: {str(e)}"
        }
    
    except requests.exceptions.ConnectionError:
        return {
            "error": "Connection error",
            "message": "Unable to connect to weather service. Please check your internet connection."
        }
    
    except requests.exceptions.Timeout:
        return {
            "error": "Timeout error",
            "message": "Weather service is taking too long to respond. Please try again."
        }
    
    except Exception as e:
        return {
            "error": "Unexpected error",
            "message": "An unexpected error occurred while fetching weather data.",
            "details": str(e)
        }

@app.get("/health")
async def health_check():
    """Health check endpoint for Render monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "weather-api",
        "version": "2.0.0",
        "api_type": "Open-Meteo"
    }

@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment variables"""
    return {
        "api_type": "Open-Meteo (No API Key Required)",
        "current_directory": os.getcwd(),
        "all_env_vars": list(os.environ.keys())
    }

# Helper function to format data to match WeatherAPI structure
def format_weather_data(data, city_name, country, lat, lon, timezone):
    """Format Open-Meteo data to match WeatherAPI response structure"""
    
    # Map WMO weather codes to WeatherAPI-like conditions
    weather_codes = {
        0: {"text": "Clear", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"},
        1: {"text": "Clear", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"},
        2: {"text": "Partly cloudy", "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png"},
        3: {"text": "Overcast", "icon": "//cdn.weatherapi.com/weather/64x64/day/119.png"},
        45: {"text": "Fog", "icon": "//cdn.weatherapi.com/weather/64x64/day/248.png"},
        48: {"text": "Fog", "icon": "//cdn.weatherapi.com/weather/64x64/day/248.png"},
        51: {"text": "Light drizzle", "icon": "//cdn.weatherapi.com/weather/64x64/day/263.png"},
        53: {"text": "Moderate drizzle", "icon": "//cdn.weatherapi.com/weather/64x64/day/263.png"},
        55: {"text": "Heavy drizzle", "icon": "//cdn.weatherapi.com/weather/64x64/day/263.png"},
        56: {"text": "Light freezing drizzle", "icon": "//cdn.weatherapi.com/weather/64x64/day/263.png"},
        57: {"text": "Heavy freezing drizzle", "icon": "//cdn.weatherapi.com/weather/64x64/day/263.png"},
        61: {"text": "Light rain", "icon": "//cdn.weatherapi.com/weather/64x64/day/296.png"},
        63: {"text": "Moderate rain", "icon": "//cdn.weatherapi.com/weather/64x64/day/299.png"},
        65: {"text": "Heavy rain", "icon": "//cdn.weatherapi.com/weather/64x64/day/308.png"},
        66: {"text": "Light freezing rain", "icon": "//cdn.weatherapi.com/weather/64x64/day/311.png"},
        67: {"text": "Heavy freezing rain", "icon": "//cdn.weatherapi.com/weather/64x64/day/311.png"},
        71: {"text": "Light snow", "icon": "//cdn.weatherapi.com/weather/64x64/day/323.png"},
        73: {"text": "Moderate snow", "icon": "//cdn.weatherapi.com/weather/64x64/day/326.png"},
        75: {"text": "Heavy snow", "icon": "//cdn.weatherapi.com/weather/64x64/day/329.png"},
        77: {"text": "Snow grains", "icon": "//cdn.weatherapi.com/weather/64x64/day/329.png"},
        80: {"text": "Light rain showers", "icon": "//cdn.weatherapi.com/weather/64x64/day/296.png"},
        81: {"text": "Moderate rain showers", "icon": "//cdn.weatherapi.com/weather/64x64/day/299.png"},
        82: {"text": "Heavy rain showers", "icon": "//cdn.weatherapi.com/weather/64x64/day/308.png"},
        85: {"text": "Light snow showers", "icon": "//cdn.weatherapi.com/weather/64x64/day/323.png"},
        86: {"text": "Heavy snow showers", "icon": "//cdn.weatherapi.com/weather/64x64/day/329.png"},
        95: {"text": "Thunderstorm", "icon": "//cdn.weatherapi.com/weather/64x64/day/386.png"},
        96: {"text": "Thunderstorm with hail", "icon": "//cdn.weatherapi.com/weather/64x64/day/386.png"},
        99: {"text": "Thunderstorm with heavy hail", "icon": "//cdn.weatherapi.com/weather/64x64/day/386.png"}
    }

    # Get current weather
    current = data.get("current", {})
    current_weather_code = current.get("weather_code")
    current_condition = weather_codes.get(current_weather_code, {"text": "Unknown", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"})
    
    current_temp_c = current.get("temperature_2m")
    current_temp_f = current_temp_c * 9/5 + 32 if current_temp_c is not None else None
    
    # Get daily forecast
    daily = data.get("daily", {})
    forecast_days = []
    
    if daily and daily.get("time"):
        for i in range(len(daily["time"])):
            day_code = daily.get("weather_code", [None])[i]
            day_condition = weather_codes.get(day_code, {"text": "Unknown", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"})
            
            forecast_days.append({
                "date": daily["time"][i],
                "day": {
                    "maxtemp_c": daily.get("temperature_2m_max", [None])[i],
                    "maxtemp_f": daily.get("temperature_2m_max", [None])[i] * 9/5 + 32 if daily.get("temperature_2m_max", [None])[i] is not None else None,
                    "mintemp_c": daily.get("temperature_2m_min", [None])[i],
                    "mintemp_f": daily.get("temperature_2m_min", [None])[i] * 9/5 + 32 if daily.get("temperature_2m_min", [None])[i] is not None else None,
                    "condition": day_condition,
                    "daily_chance_of_rain": daily.get("precipitation_probability_max", [None])[i]
                }
            })

    # Format response to match WeatherAPI structure
    return {
        "location": {
            "name": city_name,
            "country": country,
            "lat": lat,
            "lon": lon,
            "timezone": timezone
        },
        "current": {
            "temp_c": current_temp_c,
            "temp_f": current_temp_f,
            "condition": current_condition,
            "humidity": current.get("relative_humidity_2m"),
            "feelslike_c": current.get("apparent_temperature"),
            "feelslike_f": current.get("apparent_temperature") * 9/5 + 32 if current.get("apparent_temperature") is not None else None,
            "wind_kph": current.get("wind_speed_10m") * 3.6 if current.get("wind_speed_10m") is not None else None,
            "cloud": current.get("cloud_cover"),
            "precip_mm": current.get("precipitation")
        },
        "forecast": {
            "forecastday": forecast_days
        }
    }

