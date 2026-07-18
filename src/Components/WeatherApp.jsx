import logo from "../images/logo.svg";
import IconUnits from "../images/IconUnits.svg";
import IconDropdown from "../images/IconDropdown.svg";
import IconSearch from "../images/IconSearch.svg";
import { useState } from "react";
import axios from "axios";

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

  const API_URL = import.meta.env.VITE_API_URL || 'https://weather-main-app-5dg7.onrender.com';

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
        `${API_URL}/weather?city=${encodeURIComponent(search)}`
      );
      
      // ✅ Check if response contains an error
      if (res.data.error) {
        setError(res.data.message || "City not found");
        setWeather(null);
      } else {
        // ✅ The backend now returns Open-Meteo format
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

  // ✅ Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      getWeather();
    }
  };

  // ✅ Format temperature based on selected unit
  const formatTemp = (tempC, tempF) => {
    const isFahrenheit = selectedUnit.includes("Fahrenheit(°F)");
    if (isFahrenheit) {
      return `${Math.round(tempF || 0)}°F`;
    }
    return `${Math.round(tempC || 0)}°C`;
  };

  // ✅ Format wind speed
  const formatWind = (windKph, windMph) => {
    const isKmh = selectedUnit.includes("km/h");
    if (isKmh) {
      return `${Math.round(windKph || 0)} km/h`;
    }
    return `${Math.round(windMph || 0)} mph`;
  };

  // ✅ Format precipitation
  const formatPrecip = (precipMm, precipIn) => {
    const isMm = selectedUnit.includes("Millimeters (mm)");
    if (isMm) {
      return `${precipMm || 0} mm`;
    }
    return `${precipIn || 0} in`;
  };


  return (
    <div className="bg-[hsl(243,96%,9%)] min-h-screen">
      {/* Navigation */}
      <nav>
        <ul className="flex gap-2 ml-auto px-10 py-10 w-full justify-between">
          <img src={logo} alt="logo" />
          <div className="relative right-20 w-auto">
            <div 
              className="cursor-pointer w-[40] h-10 bg-[hsl(243,27%,20%)] flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center"
              onClick={() => setShowUnits(!showUnits)}
            >
              <div className="flex items-center p-1 gap-2  w-auto justify-center">
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

      {/* Error State - Only shows when there's an error */}
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

      {/* Weather Display - Only shows when weather data exists */}
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
              {/* Left: Temperature and Condition */}
              <div>
                <div className="text-6xl font-bold text-white">
                  {formatTemp(
                    weather.current?.temp_c,
                    weather.current?.temp_f
                  )}
                </div>
                <p className="text-xl text-gray-300 mt-2">
                  {weather.current?.condition?.text || "Clear"}
                </p>
                <p className="text-gray-400 mt-1">
                  Feels like: {formatTemp(
                    weather.current?.feelslike_c,
                    weather.current?.feelslike_f
                  )}
                </p>
              </div>

              {/* Right: Weather Details */}
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

            {/* 7-Day Forecast */}
            {weather.forecast?.forecastday && (
              <div className="mt-8">
                <h3 className="text-white font-bold text-xl mb-4">7-Day Forecast</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {weather.forecast.forecastday.map((day, index) => {
                    const date = new Date(day.date);
                    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    return (
                      <div key={index} className="bg-[hsla(300,2%,19%,0.4)] rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-sm">{dayName}</p>
                        <p className="text-white font-bold text-sm mt-1">
                          {formatTemp(day.day?.maxtemp_c, day.day?.maxtemp_f)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatTemp(day.day?.mintemp_c, day.day?.mintemp_f)}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {day.day?.condition?.text || 'Clear'}
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
          </div>
        </div>
      )}
    </div>
  );
}
export default WeatherApp

