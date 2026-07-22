import logo from "../images/logo.svg";
import IconUnits from "../images/IconUnits.svg";
import IconDropdown from "../images/IconDropdown.svg";
import IconSearch from "../images/IconSearch.svg";
import { useState, useMemo } from "react";
import axios from "axios";

// ✅ Import weather icons
import IconSunny from "../images/IconSunny.webp";
import IconSnow from "../images/IconSnow.webp";
import IconStorm from "../images/IconStorm.webp";
import IconRain from "../images/IconRain.webp";
import IconPartly from "../images/IconPartly-cloudy.webp";
import IconFog from "../images/IconFog.webp";
import IconDrizzle from "../images/IconDrizzle.webp";
import IconOvercast from "../images/IconOvercast.webp";

// Map weather conditions to icons
const weatherIconMap = {
  "Clear": IconSunny,
  "Sunny": IconSunny,
  "Partly cloudy": IconPartly,
  "Cloudy": IconOvercast,
  "Overcast": IconOvercast,
  "Mist": IconFog,
  "Fog": IconFog,
  "Light rain": IconRain,
  "Moderate rain": IconRain,
  "Heavy rain": IconRain,
  "Rain": IconRain,
  "Patchy rain possible": IconRain,
  "Light drizzle": IconDrizzle,
  "Drizzle": IconDrizzle,
  "Thunderstorm": IconStorm,
  "Snow": IconSnow,
  "Light snow": IconSnow,
  "Moderate snow": IconSnow,
  "Heavy snow": IconSnow,
};

const getWeatherIcon = (condition) => {
  if (!condition) return IconSunny;
  const conditionText = typeof condition === 'string' ? condition : condition?.text || '';
  for (const [key, value] of Object.entries(weatherIconMap)) {
    if (conditionText.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return IconSunny;
};

export function WeatherApp() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState([
    "Celsius(°C)", 
    "km/h", 
    "Millimeters (mm)"
  ]);
  const [showUnits, setShowUnits] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Today");
  const [isOpen, setIsOpen] = useState(false);

  const units = [
    { label: "Switch to imperial" },
    { label: "Temperature" },
    { label: "Celsius(°C)" },
    { label: "Fahrenheit(°F)" },
    { divider: true },
    { label: "Wind Speed" },
    { label: "km/h" },
    { label: "mph" },
    { divider: true },
    { label: "Precipitation" },
    { label: "Millimeters (mm)" },
    { label: "Inches (in)" } 
  ];

  const API_URL = import.meta.env.VITE_API_URL || 'https://weather-main-app-qm9s.onrender.com';

  // ✅ Use useMemo to compute available days from weather data
  const availableDays = useMemo(() => {
    if (!weather?.forecast?.forecastday) return ["Today"];
    return weather.forecast.forecastday.map(day => day.dayName || "Today");
  }, [weather]);

  // ✅ Ensure selected day is valid - if not, set to first available day
  const validSelectedDay = useMemo(() => {
    if (availableDays.includes(selectedDay)) {
      return selectedDay;
    }
    return availableDays[0] || "Today";
  }, [availableDays, selectedDay]);

  const getWeather = async () => {
    if (!search.trim()) {
      setError("Please enter a city name");
      return;
    }

    setLoading(true);
    setError(null);
    setWeather(null);

    try {
      const res = await axios.get(
        `${API_URL}/weather?city=${encodeURIComponent(search.trim())}`
      );
      
      if (res.data.error) {
        setError(res.data.message || "City not found");
        setWeather(null);
      } else {
        console.log('Weather API Response:', res.data);
        
        // ✅ Format forecast with dynamic day names
        if (res.data.forecast?.forecastday) {
          const forecastDays = res.data.forecast.forecastday.map((item) => {
            // Use the dayName from the backend (which is dynamically calculated)
            const dayName = item.dayName || "Today";
            
            // ✅ Ensure hour data is properly formatted
            let hourData = [];
            
            // ✅ Check if hour data exists in the response
            if (item.hour && Array.isArray(item.hour) && item.hour.length > 0) {
              // Use the existing hour data
              hourData = item.hour.map(hour => ({
                time: hour.time || "",
                temp_c: hour.temp_c || 0,
                temp_f: hour.temp_f || 0,
                condition: hour.condition || "Clear",
                icon: hour.icon || "",
                humidity: hour.humidity || 0,
                wind_kph: hour.wind_kph || 0,
                wind_mph: hour.wind_mph || 0,
                precip_mm: hour.precip_mm || 0,
                precip_in: hour.precip_in || 0,
                chance_of_rain: hour.chance_of_rain || 0,
              }));
            }
            
            return {
              ...item,
              dayName: dayName,
              hour: hourData
            };
          });
          res.data.forecast.forecastday = forecastDays;
        }
        
        setWeather(res.data);
        setError(null);
      }
    } catch (err) {
      console.error("Weather API Error:", err);
      
      if (err.response?.status === 404 || err.response?.status === 400) {
        setError("City not found. Please enter a valid city name.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(err.response?.data?.message || "Failed to fetch weather data. Please try again.");
      }
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      getWeather();
    }
  };

  const formatTemp = (tempC, tempF) => {
    const isFahrenheit = selectedUnit.includes("Fahrenheit(°F)");
    if (isFahrenheit) {
      return `${Math.round(tempF || 0)}°F`;
    }
    return `${Math.round(tempC || 0)}°C`;
  };

  const formatTempShort = (tempC, tempF) => {
    const isFahrenheit = selectedUnit.includes("Fahrenheit(°F)");
    if (isFahrenheit) {
      return `${Math.round(tempF || 0)}°`;
    }
    return `${Math.round(tempC || 0)}°`;
  };

  const formatWind = (windKph, windMph) => {
    const isKmh = selectedUnit.includes("km/h");
    if (isKmh) {
      return `${Math.round(windKph || 0)} km/h`;
    }
    return `${Math.round(windMph || 0)} mph`;
  };

  const formatPrecip = (precipMm, precipIn) => {
    const isMm = selectedUnit.includes("Millimeters (mm)");
    if (isMm) {
      return `${precipMm || 0} mm`;
    }
    return `${precipIn || 0} in`;
  };

  // ✅ Format time to "3 PM" format (without minutes)
  const formatHourlyTime = (timeStr) => {
    if (!timeStr) return '12 PM';
    
    let timePart = timeStr;
    if (timeStr.includes('T')) {
      timePart = timeStr.split('T')[1];
    }
    if (timeStr.includes(' ')) {
      timePart = timeStr.split(' ')[1];
    }
    
    if (timePart.includes(':')) {
      const [hours] = timePart.split(':');
      const hourNum = parseInt(hours, 10);
      const isPM = hourNum >= 12;
      const hour12 = hourNum % 12 || 12;
      return `${hour12} ${isPM ? 'PM' : 'AM'}`;
    }
    
    return timePart;
  };

  // ✅ Get selected day forecast
  const getSelectedDayForecast = () => {
    if (!weather?.forecast?.forecastday) return null;
    return weather.forecast.forecastday.find(day => day.dayName === validSelectedDay);
  };

  const selectedDayForecast = getSelectedDayForecast();
  
  // ✅ Get all hours from the selected day
  const allHours = selectedDayForecast?.hour || [];
  console.log('All hours for selected day:', allHours.length);

  // ✅ Filter hours from 3 PM to 10 PM (15:00 to 22:00)
  // If no hours in that range, show first 8 hours
  const getDisplayHours = () => {
    if (!allHours || allHours.length === 0) return [];
    
    const filteredHours = allHours.filter(hour => {
      if (!hour.time) return false;
      let timeStr = hour.time;
      if (timeStr.includes('T')) {
        timeStr = timeStr.split('T')[1];
      }
      if (timeStr.includes(' ')) {
        timeStr = timeStr.split(' ')[1];
      }
      const hourNum = parseInt(timeStr.split(':')[0]);
      return hourNum >= 15 && hourNum <= 22;
    });
    
    // If no hours in range, take first 8 hours or all available
    return filteredHours.length > 0 ? filteredHours : allHours.slice(0, 8);
  };

  const displayHours = getDisplayHours();
  console.log('Display hours (3PM-10PM):', displayHours.length);

  const isFahrenheit = selectedUnit.includes("Fahrenheit(°F)");

  return (
    <div className="bg-[hsl(243,96%,9%)] min-h-screen">
      {/* Navigation */}
      <nav>
        <ul className="flex gap-2 ml-auto px-10 py-10 w-full justify-between">
          <img src={logo} alt="logo" />
          <div className="relative right-20 w-auto">
            <div 
              className="cursor-pointer w-auto h-10 bg-[hsl(243,27%,20%)] flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center"
              onClick={() => setShowUnits(!showUnits)}
            >
              <div className="flex items-center p-1 gap-2 w-auto justify-center">
                <img src={IconUnits} alt="unit" className="h-4"/>
                Units
                <img src={IconDropdown} alt="icon dropdown" className="h-3" />
              </div>
            </div>
            <div className="relative">  
              {showUnits && (
                <div className="absolute top-full left-auto mt-1 w-auto cursor-pointer p-3 bg-[hsl(243,27%,20%)] border border-gray-700 rounded-md z-50 text-amber-50 shadow-xl">
                  {units.map((unit, index) => (
                    <div key={index}>
                      {unit.divider ? (
                        <div className="border-t border-gray-600 my-2"></div>
                      ) : (
                        <div 
                          onClick={() => {
                            setSelectedUnit((prev) =>
                              prev.includes(unit.label)
                                ? prev.filter((item) => item !== unit.label)
                                : [...prev, unit.label]
                            );
                          }}
                          className="flex items-center text-amber-50 font-bold p-2 hover:bg-[hsl(243,23%,30%)] rounded-md cursor-pointer transition-colors"
                        >
                          <span className="whitespace-nowrap">{unit.label}</span>
                          {selectedUnit.includes(unit.label) && (
                            <span className="flex ml-auto items-center text-green-400 font-bold">✓</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>      
          </div>
        </ul>
      </nav>

      {/* Search Section */}
      <div className="w-full items-center justify-center px-5 py-5">
        <h1 className="text-4xl font-bold text-amber-50 text-center mb-6">
          How's the sky looking today?
        </h1>
        
        <div className="flex justify-center gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <img 
              src={IconSearch} 
              alt="search" 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50"
            />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search for a city..."
              className="w-full h-10 bg-[hsla(255,3%,31%,0.66)] border border-gray-700 rounded-md px-10 py-2 text-white outline-none focus:border-blue-500"
              disabled={loading}
            />
          </div>
          <button 
            onClick={getWeather}
            disabled={loading}
            className={`w-24 h-10 rounded-md text-amber-50 font-bold ${
              loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-[hsl(233,67%,56%)] hover:bg-[hsl(233,67%,46%)] cursor-pointer'
            }`}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-white text-xl font-bold">Loading weather...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex justify-center px-5 py-10">
          <div className="bg-red-500/20 border border-red-500 text-red-500 px-6 py-4 rounded-md max-w-2xl text-center">
            <p className="font-bold">{error}</p>
            <button 
              onClick={getWeather}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Weather Display */}
      {weather && !loading && !error && (
        <div className="max-w-4xl mx-auto px-5 py-10">
          <div className="bg-[hsla(300,2%,19%,0.57)] border border-gray-700 rounded-lg p-6">
            {/* City Name */}
            <h2 className="text-3xl font-bold text-white">
              {weather.location?.name}, {weather.location?.country}
            </h2>
            <p className="text-gray-400">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            
            {/* Main Weather Display */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-4">
                  <span className="text-6xl font-bold text-white">
                    {formatTemp(
                      weather.current?.temp_c,
                      weather.current?.temp_f
                    )}
                  </span>
                  <img 
                    src={getWeatherIcon(weather.current?.condition)} 
                    alt="weather icon"
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <p className="text-xl text-gray-300 mt-2">
                  {typeof weather.current?.condition === 'string' 
                    ? weather.current.condition 
                    : weather.current?.condition?.text || "Clear"}
                </p>
                <p className="text-gray-400 mt-1">
                  Feels like: {formatTemp(
                    weather.current?.feelslike_c,
                    weather.current?.feelslike_f
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Humidity</p>
                  <p className="text-white font-bold text-lg">
                    {weather.current?.humidity || 0}%
                  </p>
                </div>
                <div className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Wind</p>
                  <p className="text-white font-bold text-lg">
                    {formatWind(
                      weather.current?.wind_kph,
                      weather.current?.wind_mph
                    )}
                  </p>
                </div>
                <div className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Precipitation</p>
                  <p className="text-white font-bold text-lg">
                    {formatPrecip(
                      weather.current?.precip_mm,
                      weather.current?.precip_in
                    )}
                  </p>
                </div>
                <div className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3">
                  <p className="text-gray-400 text-sm">Cloud Cover</p>
                  <p className="text-white font-bold text-lg">
                    {weather.current?.cloud || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* 7-Day Forecast - Using dynamic day names */}
            {weather.forecast?.forecastday && weather.forecast.forecastday.length > 0 && (
              <div className="mt-8">
                <h3 className="text-white font-bold text-xl mb-4">7-Day Forecast</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weather.forecast.forecastday.map((day, index) => {
                    const dayName = day.dayName || `Day ${index + 1}`;
                    const icon = getWeatherIcon(day.day?.condition);
                    
                    return (
                      <div key={index} className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-sm">{dayName}</p>
                        <div className="flex justify-center my-1">
                          <img src={icon} alt="weather" className="h-10 w-10 object-contain" />
                        </div>
                        <p className="text-white font-bold text-sm mt-1">
                          {formatTempShort(day.day?.maxtemp_c, day.day?.maxtemp_f)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatTempShort(day.day?.mintemp_c, day.day?.mintemp_f)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1 truncate">
                          {typeof day.day?.condition === 'string' 
                            ? day.day.condition 
                            : day.day?.condition?.text || 'Clear'}
                        </p>
                        {day.day?.daily_chance_of_rain > 0 && (
                          <p className="text-blue-400 text-xs mt-1">
                            🌧️ {day.day.daily_chance_of_rain}%
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ✅ Hourly Forecast - Dynamic with API Data */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-xl">Hourly forecast</h3>
                <div className="relative">
                  <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer w-28 h-8 bg-[hsl(243,27%,20%)] flex items-center gap-1 px-3 rounded-md text-amber-50 font-bold justify-center text-sm"
                  >
                    {validSelectedDay}
                    <img src={IconDropdown} alt="icon dropdown" className="h-2" />
                  </div>
                  {isOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-[hsl(243,27%,20%)] rounded-md shadow-md border border-gray-600 z-50">
                      {availableDays.map((day, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setSelectedDay(day);
                            setIsOpen(false);
                          }}
                          className="px-4 py-2 rounded-md hover:bg-[hsl(243,23%,24%)] cursor-pointer text-amber-50 text-sm"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ Dynamic Hourly data with icons, times, and temps */}
              {displayHours.length > 0 ? (
                <div className="space-y-2">
                  {displayHours.map((hour, index) => {
                    const formattedTime = formatHourlyTime(hour.time);
                    const icon = getWeatherIcon(hour.condition);
                    const temperature = isFahrenheit
                      ? Math.round(hour.temp_f || 0)
                      : Math.round(hour.temp_c || 0);

                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between px-4 py-3 bg-[hsla(300,2%,19%,0.4)] rounded-lg border border-gray-700 hover:bg-[hsla(300,2%,25%,0.7)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={icon} 
                            alt="weather icon" 
                            className="h-8 w-8 object-contain" 
                          />
                          <span className="text-white font-medium text-sm">
                            {formattedTime}
                          </span>
                        </div>
                        <span className="text-white font-bold">
                          {temperature}°
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // ✅ No data available message
                <div className="text-gray-400 text-center py-8 bg-[hsla(300,2%,19%,0.4)] rounded-lg border border-gray-700">
                  <p className="text-white">No hourly data available</p>
                  <p className="text-sm mt-2">Try selecting another day or city</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherApp;