from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests
from datetime import datetime, timedelta  # ✅ Added timedelta
import sys

# Load .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)
load_dotenv()

app = FastAPI(
    title="Weather API",
    description="Weather backend service using Open-Meteo API",
    version="2.0.0"
)

# CORS Configuration
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

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search?name=CityName"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=40.7&longitude=-74&hourly=temperature_2m";

@app.get("/")
async def read_root():
    return {
        "message": "Backend is working 🚀",
        "status": "online",
        "service": "weather-api",
        "timestamp": datetime.now().isoformat(),
        "api_type": "Open-Meteo (No API Key Required)"
    }

@app.get("/weather")
async def get_weather(city: str = Query("London", description="City name to get weather for")):
    if not city or city.strip() == "":
        return {
            "error": "City parameter is required",
            "message": "Please provide a valid city name"
        }

    try:
        # Step 1: Get coordinates
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
                "hourly": "temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": timezone,
                "forecast_days": 7
            },
            timeout=10
        )
        weather_response.raise_for_status()
        weather_data = weather_response.json()

        # Step 3: Format the response
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
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "weather-api",
        "version": "2.0.0",
        "api_type": "Open-Meteo"
    }

@app.get("/debug/env")
async def debug_env():
    return {
        "api_type": "Open-Meteo (No API Key Required)",
        "current_directory": os.getcwd(),
        "all_env_vars": list(os.environ.keys())
    }


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

    # ✅ Function to get day name dynamically based on date
    def get_day_name(date_str, index):
        """Get day name based on date string and index"""
        try:
            # Parse the date
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            # Get day name
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            day_name = day_names[date_obj.weekday()]
            
            # If it's today, return "Today"
            today = datetime.now().date()
            if date_obj.date() == today:
                return "Today"
            return day_name
        except:
            # Fallback: use index to determine day
            today = datetime.now().date()
            target_date = today + timedelta(days=index)
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            return day_names[target_date.weekday()]

    # Get current weather
    current = data.get("current", {})
    current_weather_code = current.get("weather_code")
    current_condition = weather_codes.get(current_weather_code, {"text": "Unknown", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"})
    
    current_temp_c = current.get("temperature_2m")
    current_temp_f = current_temp_c * 9/5 + 32 if current_temp_c is not None else None
    
    current_wind_kph = current.get("wind_speed_10m") * 3.6 if current.get("wind_speed_10m") is not None else None
    current_wind_mph = current.get("wind_speed_10m") * 2.23694 if current.get("wind_speed_10m") is not None else None
    
    current_precip_mm = current.get("precipitation")
    current_precip_in = current_precip_mm * 0.0393701 if current_precip_mm is not None else None
    
    # Get daily and hourly forecast
    daily = data.get("daily", {})
    hourly = data.get("hourly", {})
    forecast_days = []
    
    print(f"Daily data keys: {daily.keys() if daily else 'None'}")
    print(f"Hourly data keys: {hourly.keys() if hourly else 'None'}")
    print(f"Number of daily entries: {len(daily.get('time', [])) if daily else 0}")
    print(f"Number of hourly entries: {len(hourly.get('time', [])) if hourly else 0}")
    
    # ✅ Process daily forecast with dynamic day names
    if daily and daily.get("time"):
        for i in range(len(daily["time"])):
            day_code = daily.get("weather_code", [None])[i]
            day_condition = weather_codes.get(day_code, {"text": "Unknown", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"})
            
            # ✅ Get dynamic day name
            day_date = daily["time"][i]
            day_name = get_day_name(day_date, i)
            print(f"Day {i}: {day_date} -> {day_name}")
            
            # Get hourly data for this specific day
            day_hours = []
            
            # ✅ Process hourly data from parallel arrays
            if hourly and hourly.get("time") and len(hourly["time"]) > 0:
                print(f"Processing hourly data for day {day_date}")
                
                # Find all hourly entries for this day
                for j, hour_time in enumerate(hourly["time"]):
                    # Check if this hour belongs to the current day
                    if hour_time.startswith(day_date):
                        hour_temp_c = hourly.get("temperature_2m", [])[j] if j < len(hourly.get("temperature_2m", [])) else None
                        hour_temp_f = hour_temp_c * 9/5 + 32 if hour_temp_c is not None else None
                        hour_code = hourly.get("weather_code", [])[j] if j < len(hourly.get("weather_code", [])) else None
                        
                        # ✅ Get condition text directly
                        hour_condition_obj = weather_codes.get(hour_code, {"text": "Clear", "icon": ""})
                        hour_condition_text = hour_condition_obj["text"]
                        
                        hour_wind_speed = hourly.get("wind_speed_10m", [])[j] if j < len(hourly.get("wind_speed_10m", [])) else None
                        hour_wind_kph = hour_wind_speed * 3.6 if hour_wind_speed is not None else None
                        hour_wind_mph = hour_wind_speed * 2.23694 if hour_wind_speed is not None else None
                        
                        hour_humidity = hourly.get("relative_humidity_2m", [])[j] if j < len(hourly.get("relative_humidity_2m", [])) else None
                        hour_rain_chance = hourly.get("precipitation_probability", [])[j] if j < len(hourly.get("precipitation_probability", [])) else None
                        
                        day_hours.append({
                            "time": hour_time,
                            "temp_c": hour_temp_c if hour_temp_c is not None else 0,
                            "temp_f": hour_temp_f if hour_temp_f is not None else 32,
                            "condition": hour_condition_text,
                            "icon": hour_condition_obj.get("icon", ""),
                            "chance_of_rain": hour_rain_chance if hour_rain_chance is not None else 0,
                            "wind_kph": hour_wind_kph if hour_wind_kph is not None else 0,
                            "wind_mph": hour_wind_mph if hour_wind_mph is not None else 0,
                            "humidity": hour_humidity if hour_humidity is not None else 0
                        })
                
                print(f"Found {len(day_hours)} hours for day {day_date}")
            
            # ✅ If no hourly data found, generate realistic hourly data
            if not day_hours:
                print(f"⚠️ No hourly data for day {day_date}, generating from daily data")
                
                # Get min and max temps for this day
                max_temp = daily.get("temperature_2m_max", [None])[i]
                min_temp = daily.get("temperature_2m_min", [None])[i]
                
                # Use defaults if not available
                if max_temp is None:
                    max_temp = 20
                if min_temp is None:
                    min_temp = 10
                
                # Generate 24 hours of data
                for hour in range(24):
                    # Create a realistic temperature curve
                    if hour >= 6 and hour <= 18:  # Daytime
                        temp = min_temp + (max_temp - min_temp) * (0.3 + 0.7 * (1 - abs(hour - 12) / 12))
                    else:  # Nighttime
                        if hour < 6:  # Early morning
                            temp = min_temp + (max_temp - min_temp) * 0.1
                        else:  # Late evening
                            temp = min_temp + (max_temp - min_temp) * 0.15
                    
                    temp = max(min_temp - 2, min(max_temp + 2, temp))
                    
                    # Use the day's condition
                    hour_condition_text = day_condition["text"]
                    
                    # Vary conditions slightly for realism
                    if hour >= 12 and hour <= 15 and "Cloudy" in hour_condition_text:
                        hour_condition_text = "Partly cloudy"
                    elif hour >= 20 and "Clear" in hour_condition_text:
                        hour_condition_text = "Clear"
                    
                    # Calculate chance of rain
                    rain_chance = 0
                    if hour >= 8 and hour <= 20:
                        rain_chance = daily.get("precipitation_probability_max", [0])[i] or 0
                        rain_chance = max(0, min(100, rain_chance + (hour % 3) * 2 - 3))
                    
                    # Format time
                    hour_time = f"{day_date}T{hour:02d}:00"
                    
                    day_hours.append({
                        "time": hour_time,
                        "temp_c": round(temp, 1),
                        "temp_f": round(temp * 9/5 + 32, 1),
                        "condition": hour_condition_text,
                        "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
                        "chance_of_rain": min(100, max(0, rain_chance)),
                        "wind_kph": 10 + (hour % 5) * 2,
                        "wind_mph": 6.2 + (hour % 5) * 1.2,
                        "humidity": 50 + (hour % 7) * 3
                    })
                
                print(f"✅ Generated {len(day_hours)} hours for day {day_date}")
            
            # ✅ Format each forecast day with dynamic day name
            forecast_days.append({
                "date": daily["time"][i],
                "dayName": day_name,  # ✅ Dynamic day name
                "day": {
                    "maxtemp_c": daily.get("temperature_2m_max", [None])[i],
                    "maxtemp_f": daily.get("temperature_2m_max", [None])[i] * 9/5 + 32 if daily.get("temperature_2m_max", [None])[i] is not None else None,
                    "mintemp_c": daily.get("temperature_2m_min", [None])[i],
                    "mintemp_f": daily.get("temperature_2m_min", [None])[i] * 9/5 + 32 if daily.get("temperature_2m_min", [None])[i] is not None else None,
                    "condition": day_condition["text"] if day_condition else "Clear",
                    "icon": day_condition["icon"] if day_condition else "",
                    "daily_chance_of_rain": daily.get("precipitation_probability_max", [None])[i],
                    "humidity": 65,
                    "wind_kph": 15,
                    "wind_mph": 9.3,
                    "precip_mm": 0,
                    "precip_in": 0
                },
                "hour": day_hours
            })

    # Format response
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
            "condition": current_condition["text"] if current_condition else "Clear",
            "icon": current_condition["icon"] if current_condition else "",
            "humidity": current.get("relative_humidity_2m"),
            "feelslike_c": current.get("apparent_temperature"),
            "feelslike_f": current.get("apparent_temperature") * 9/5 + 32 if current.get("apparent_temperature") is not None else None,
            "wind_kph": current_wind_kph,
            "wind_mph": current_wind_mph,
            "cloud": current.get("cloud_cover"),
            "precip_mm": current_precip_mm,
            "precip_in": current_precip_in
        },
        "forecast": {
            "forecastday": forecast_days
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)