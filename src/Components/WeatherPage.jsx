import IconDropdown from "../images/IconDropdown.svg";
import logo from "../images/logo.svg";
import IconSearch from "../images/IconSearch.svg";
import BgTodayLarge from "../images/BgTodayLarge.svg";
import IconSunny from "../images/IconSunny.webp"
import { useState } from "react";
import IconSnow from "../images/IconSnow.webp";
import IconStorm from "../images/IconStorm.webp";
import IconRain from "../images/IconRain.webp";
import IconPartly from "../images/IconPartly-cloudy.webp";
import IconFog from "../images/IconFog.webp";
import IconDrizzle from "../images/IconDrizzle.webp";
import IconUnits from '../images/IconUnits.svg';
import iconLoading from "../images/IconLoading.svg";
import BgTodaySmall from "../images/BgTodaySmall.svg";
import axios from "axios";

// Map weather conditions to icons
const weatherIconMap = {
  "Clear": IconSunny,
  "Partly cloudy": IconPartly,
  "Cloudy": IconPartly,
  "Overcast": IconPartly,
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
  for (const [key, value] of Object.entries(weatherIconMap)) {
    if (condition.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return IconSunny;
};

export function WeatherPage() {
  const [weather, setWeather] = useState(null);
  const [showdropdown, setShowDropDown] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState([
    "Celsius(°C)",
    "km/h",
    "Millimeters(mm)"
  ]);
  const today = new Date();
  const [showUnits, setShowUnits] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchCity, setSearchCity] = useState("");

  const names = ["London", "New York", "Tokyo", "Paris"];

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
    { label: "Millimeters(mm)" },
    { label: "Inches(in)" }
  ];

  const isFahrenheit = selectedUnit.includes("Fahrenheit(°F)");
  
  const isKmh = selectedUnit.includes("km/h");
  const isMph = selectedUnit.includes("mph");
  const isMM = selectedUnit.includes("Millimeters(mm)");
  const isInches = selectedUnit.includes("Inches(in)");

  const feelsLikeLabel = (temp) => {
    if (temp < 10) return "Cold";
    if (temp < 25) return "Comfortable";
    return "Hot";
  };

  const API_URL = import.meta.env.VITE_API_URL || 'https://weather-main-app-5dg7.onrender.com';

  const getWeather = async () => {
    if (!searchCity.trim()) return;

    setLoading(true);
    setError(null);
    setWeather(null);
    
    try {
      const res = await axios.get(
        `${API_URL}/weather?city=${encodeURIComponent(searchCity)}`
      );

      // ✅ Extract data from the new Open-Meteo format
      const data = res.data;
      
      // Format forecast days
      const forecastDays = data.forecast?.forecastday?.map((item, index) => {
        const date = new Date(item.date);
        const dayName = index === 0 ? "Today" : date.toLocaleDateString('en-US', { weekday: 'long' });

        return {
          date: item.date,
          dayName: dayName,
          max_temp_c: item.day?.maxtemp_c || 0,
          max_temp_f: item.day?.maxtemp_f || 0,
          min_temp_c: item.day?.mintemp_c || 0,
          min_temp_f: item.day?.mintemp_f || 0,
          condition: item.day?.condition?.text || "Clear",
          icon: item.day?.condition?.icon || "",
          humidity: item.day?.humidity || 0,
          wind_kph: item.day?.wind_kph || 0,
          wind_mph: item.day?.wind_mph || 0,
          precip_mm: item.day?.precip_mm || 0,
          precip_in: item.day?.precip_in || 0,
          chance_of_rain: item.day?.daily_chance_of_rain || 0,
          // Hourly data for this day
          hour: item.hour || []
        };
      }) || [];

      setWeather({
        city: data.location?.name || "Unknown",
        country: data.location?.country || "",
        current: {
          temp_c: data.current?.temp_c || 0,
          temp_f: data.current?.temp_f || 0,
          feelslike_c: data.current?.feelslike_c || 0,
          feelslike_f: data.current?.feelslike_f || 0,
          humidity: data.current?.humidity || 0,
          wind_kph: data.current?.wind_kph || 0,
          wind_mph: data.current?.wind_mph || 0,
          precip_mm: data.current?.precip_mm || 0,
          precip_in: data.current?.precip_in || 0,
        },
        forecast: forecastDays,
      });
      
      setError(null);
    } catch (err) {
      console.error("Weather fetch error:", err);
      
      if (err.response && err.response.status === 404) {
        setError("City not found. Please enter a valid city name.");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError("Error fetching weather data. Please try again.");
      }
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const getDayData = (dayName) => {
    if (!weather?.forecast) return null;
    return weather.forecast.find(day => day.dayName === dayName);
  };

  const getAvailableDays = () => {
    if (!weather?.forecast) return ["Today"];
    return weather.forecast.map(day => day.dayName);
  };

  const availableDays = getAvailableDays();
  const selectedDayForecast = getDayData(selectedDay);
  
  // ✅ Get hourly data - fallback to empty array
  const currentHours = selectedDayForecast?.hour || [];

  return (
    <>
      <div className="bg-[hsl(243,96%,9%)] min-h-screen">
        {/* Navigation */}
        <nav>
          <ul className="flex gap-2 ml-auto px-10 py-10 w-full justify-between">
            <img src={logo} alt="logo" />
            <div className="relative right-20 w-auto">
              <div 
                className="w-[40] grid cursor-pointer h-10 bg-[hsl(243,27%,20%)] lg:flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center" 
                onClick={() => setShowUnits(!showUnits)}
              >
                <div className="flex items-center p-1 gap-2 w-auto justify-center">
                  <img src={IconUnits} alt="unit" className="h-4"/>
                  Units
                  <img src={IconDropdown} alt="icon dropdown" className="h-3" />
                </div>
              </div>
              {showUnits && (
                <div className="absolute top-12 left-auto w-auto cursor-pointer p-3 bg-[hsl(243,27%,20%)] border border-gray-700 rounded-md z-50 text-amber-50">
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
                          className="flex items-center text-amber-50 font-bold p-2 hover:bg-[hsl(243,23%,30%)] rounded-md"
                        >
                          {unit.label}
                          {selectedUnit.includes(unit.label) && (
                            <span className="flex ml-auto items-center text-green-400 font-bold">✔</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ul>
        </nav>

        {/* Search Section */}
        <div className="items-center p-2 gap-3 justify-center w-full relative z-10">
          <h1 className="font-['DM Sans', sans-serif] text-7xl max-w-100 sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto font-medium px-2 py-2 text-white text-center sm:text-6xl lg:text-3xl">
            How's the sky looking today?
          </h1>
          <div className="relative justify-center w-full items-center px-5 flex py-5 gap-3">
            <div className="relative grid gap-1 max-w-full lg:flex sm:max-w-md">
              <img src={IconSearch} alt="search" className="absolute left-4 sm:left-3 lg:left-4 top-1/4 lg:top-1/2 transform -translate-y-1/2 lg:h-4 lg:w-4 sm:h-3 sm:w-3" />
              <input 
                type="text" 
                value={searchCity} 
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Search for a place..." 
                onFocus={() => setShowDropDown(true)}
                className="text-white justify-center border border-gray-700 h-10 w-auto rounded-md px-12 py-3 bg-[hsla(255,3%,31%,0.66)] outline-none"
                onKeyPress={(e) => e.key === 'Enter' && getWeather()}
                disabled={loading}
              />
              <button 
                className={`max-w-full w-full md:w-auto cursor-pointer h-10 flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center ${
                  loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[hsl(233,67%,56%)]'
                }`}
                onClick={getWeather}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>
          </div>
          
          {showdropdown && (
            <div className="relative flex justify-center ">
              <div className="cursor-pointer md:w-75 lg:w-75 w-75 p-1  justify-center absolute z-50 bg-[hsl(243,27%,20%)] border border-gray-600 rounded-md mt-1">
                {names.map((name, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      setShowDropDown(false);
                      setSearchCity(name);
                    }}
                    className=" lg:w-73 md:w-73 p-2 gap-2 w-87 font-bold rounded-md text-amber-50 hover:bg-[hsl(243,23%,24%)]"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="flex justify-center px-5 py-3">
            <div className="bg-red-500/20 border border-red-500 text-red-500 px-6 py-3 rounded-md max-w-2xl text-center">
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
              <p className="text-white text-xl font-bold">Fetching weather data...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait while we get the latest forecast</p>
            </div>
          </div>
        )}

        {/* Weather Display */}
        {!loading && weather && (
          <div className="px-5 py-5 items-center w-auto relative grid lg:flex md:max-w-auto max-w-auto">
            <div>
              {/* Main Weather Card */}
              <div className="relative flex justify-center items-center w-full">
                <div className="relative flex items-center justify-center p-1">
                  {/* Weather Info Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center right-auto p-5 z-10">
                    <img src={iconLoading} alt="icon" />
                    <i className="text-white text-2xl font-bold">{weather.city}</i>
                    <p className="text-white text-2xl font-bold">{weather.country}</p>
                    <p className="text-white text-xl font-bold">{today.toDateString()}</p>
                  </div>

                  {/* Background Images */}
                  <img 
                    src={BgTodayLarge} 
                    alt="big today" 
                    className="hidden md:block h-65 w-auto" 
                  />
                  <img 
                    src={BgTodaySmall} 
                    alt="small today" 
                    className="block md:hidden w-full" 
                  />

                  {/* Temperature and Icon */}
                  <div className="absolute right-4 flex items-center gap-2 z-10">
                    <img src={IconSunny} alt="" className="h-12 w-auto" />
                    <i className="text-6xl font-bold text-white">
                      {weather?.current && (
                        isFahrenheit
                          ? Math.round(weather.current.temp_f ?? 0)
                          : Math.round(weather.current.temp_c ?? 0)
                      )}
                      <span>°</span>
                    </i>
                  </div>
                </div>
              </div>

              {/* Weather Stats */}
              <div className="p-9 gap-4 mt-1 w-auto max-w-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 lg:w-auto">
                <div className="max-w-auto h-22 bg-[hsla(300,2%,19%,0.57)] rounded-md border border-gray-700 p-4">
                  <p className="text-[hsla(300,8%,78%,0.58)] font-bold">Feels like</p>
                  <span className="text-[hsla(300,8%,78%,0.58)] font-bold">
                    {isFahrenheit 
                      ? `${Math.round(weather.current?.feelslike_f ?? 0)}°F` 
                      : `${Math.round(weather.current?.feelslike_c ?? 0)}°C`}
                    <br />
                    {weather?.current?.feelslike_c != null &&
                      feelsLikeLabel(weather.current.feelslike_c)}
                  </span>
                </div>
                <div className="max-w-auto h-22 bg-[hsla(300,2%,19%,0.57)] rounded-md border border-gray-700 p-5">
                  <p className="text-[hsla(300,8%,78%,0.58)] font-bold">Humidity</p>
                  <span className="text-[hsla(300,8%,78%,0.58)] font-bold">
                    {weather?.current?.humidity ?? 0}%
                  </span>
                </div>
                <div className="max-w-auto h-22 bg-[hsla(300,2%,19%,0.57)] rounded-md border border-gray-700 p-5">
                  <p className="text-[hsla(300,8%,78%,0.58)] font-bold">Wind</p>
                  <span className="text-[hsla(300,8%,78%,0.58)] font-bold">
                    {isKmh
                      ? `${Math.round(weather.current?.wind_kph ?? 0)} km/h`
                      : isMph
                      ? `${Math.round(weather.current?.wind_mph ?? 0)} mph`
                      : `${Math.round(weather.current?.wind_kph ?? 0)} km/h`}
                  </span>
                </div>
                <div className="max-w-auto h-22 bg-[hsla(300,2%,19%,0.57)] rounded-md border border-gray-700 p-5">
                  <p className="text-[hsla(300,8%,78%,0.58)] font-bold">Precipitation</p>
                  <span className="text-[hsla(300,8%,78%,0.58)] font-bold">
                    {isMM
                      ? `${weather?.current?.precip_mm ?? 0} mm`
                      : isInches
                      ? `${weather?.current?.precip_in ?? 0} in`
                      : `${weather?.current?.precip_mm ?? 0} mm`}
                  </span>
                </div>
              </div>

              {/* Daily Forecast */}
              <div className="relative px-10 w-auto">
                <p className="text-white font-bold">Daily forecast</p>
              </div>

              <div className="items-center p-4 gap-2 relative w-auto grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 overflow-x-auto">
                {weather?.forecast?.map((day, index) => {
                  const dayName = index === 0 ? "Today" : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                  const icon = getWeatherIcon(day.condition);
                  
                  return (
                    <div key={index} className="min-w-auto h-40 bg-[hsla(300,2%,19%,0.57)] rounded-md border border-gray-700 p-3 shrink-0">
                      <div>
                        <p className="text-center font-bold text-white">{dayName}</p>
                        <div className="flex justify-center">
                          <img src={icon} alt={day.condition} className="h-12 w-12 object-contain" />
                        </div>
                        <div className="flex justify-between mt-1">
                          <p className="text-[hsla(300,8%,78%,0.58)] font-bold">
                            {isFahrenheit 
                              ? `${Math.round(day.max_temp_f)}°` 
                              : `${Math.round(day.max_temp_c)}°`}
                          </p>
                          <p className="text-[hsla(300,8%,78%,0.58)] font-bold">
                            {isFahrenheit
                              ? `${Math.round(day.min_temp_f)}°` 
                              : `${Math.round(day.min_temp_c)}°`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hourly Forecast */}
            <div className="ml-auto md:w-full p-4 lg:w-auto items-center w-full grid grid:flex gap-4 bg-[hsla(246,14%,27%,0.38)] rounded-lg">
              <div className="flex md:w-auto gap-5 p-4 justify-between w-full">
                <h1 className="text-xl font-bold text-white">Hourly forecast</h1>
                <div className=" ml-auto cursor-pointer w-28 h-8 bg-[hsl(243,27%,20%)] flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center">
                  <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-24 h-8 bg-[hsl(243,27%,20%)] flex items-center gap-1 p-1 rounded-md text-amber-50 font-bold justify-center"
                  >
                    {selectedDay || "Today"}
                    <img src={IconDropdown} alt="icon dropdown" className="h-2" />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border border-gray-600 absolute z-50 p-1  -mt-50 right-15  w-48 bg-[hsl(243,27%,20%)] rounded-md shadow-md">
                  {availableDays.map((day, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedDay(day);
                        setIsOpen(false);
                      }}
                      className=" px-2 py-2 w-44 rounded-md hover:bg-[hsl(243,23%,24%)] cursor-pointer text-amber-50"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              )}

              {/* Hourly Data */}
              {currentHours.slice(15, 22).map((hour, index) => {
                const time = hour.time?.split(" ")[1] || `${15 + index}:00`;
                const icon = getWeatherIcon(hour.condition?.text);
                
                return (
                  <div key={index} className="relative left-2 md:w-auto items-center w-full h-15 bg-[hsla(300,2%,19%,0.57)] rounded-lg border border-gray-700 p-3 flex">
                    <img src={icon} alt="weather icon" className="h-10 w-10 object-contain"/>
                    <p className="font-bold text-white text-center ml-2">{time}</p>
                    <div className="ml-auto flex p-2">
                      <p className="text-[hsla(300,8%,78%,0.58)] font-bold">
                        {isFahrenheit
                          ? `${Math.round(hour.temp_f)}°`
                          : `${Math.round(hour.temp_c)}°`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}