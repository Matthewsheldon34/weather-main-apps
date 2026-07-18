import { WeatherApp } from "./Components/WeatherApp";
import { WeatherPage } from "./Components/WeatherPage";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <Routes>
   <Route path="/" element={<WeatherPage />} />  
<Route path="/weatherpage" element={<WeatherPage />} /> 
<Route path="/weatherapp" element={<WeatherApp />} />  
    </Routes>
  );
}

export default App;