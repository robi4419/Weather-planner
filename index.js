import express from "express";
import axios from "axios";
import fs from "fs";

const app = express();
const port = 3000;

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API_URL = "https://api.geoapify.com/v1/geocode/search";
const GEOCODING_API_KEY = "your_api_key";

const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
const writeJSON = (path, data) =>
  fs.writeFileSync(new URL(path, import.meta.url), JSON.stringify(data));

const descriptions = loadJSON("./data/descriptions.json");
var plans = loadJSON("./data/plans.json");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

async function setWeatherData() {
  for (let i = 0; i < plans.length; i++) {
    const resGeocode = await axios.get(GEOCODING_API_URL,{
      params: {
        text: `${plans[i].city},${plans[i].country}`,
        format: "json",
        apiKey: GEOCODING_API_KEY
      }
    })
    const coords = {
      lat: resGeocode.data.results[0].lat,
      lon: resGeocode.data.results[0].lon
    }

    const resWeather = await axios.get(WEATHER_API_URL, {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"],
        timezone: "auto",
        start_date: plans[i].date,
        end_date: plans[i].date,
      },
    });
    plans[i].minTemp = resWeather.data.daily.temperature_2m_min[0];
    plans[i].maxTemp = resWeather.data.daily.temperature_2m_max[0];
    plans[i].weather = descriptions[resWeather.data.daily.weather_code[0]].day;
    plans[i].city = resGeocode.data.results[0].city;
    plans[i].country = resGeocode.data.results[0].country;
  }
  writeJSON("./data/plans.json", plans);
}

app.get("/", async (req, res) => {
  try {
    await setWeatherData();
    res.render("index.ejs", { plans });
  } catch (error) {
    console.log("Something went wrong");
  }
});

app.post("/", async (req, res) => {
  if(req.body.name && req.body.date && req.body.city && req.body.country){
    const plan = { name: req.body.name, date: req.body.date, city: req.body.city, country: req.body.country };
    plans.push(plan);
    res.redirect("/");
  }else{
    res.render("index.ejs", { plans, validationError: "Incomplete or incorrect fields vlues!" });
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}...`);
});
