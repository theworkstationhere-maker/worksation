// Adds clearly-labelled DEMO houses (demo.0001 …) so you can see busy towns while testing.
// Server must be running. Remove them later with: npm run reset
import { bulk } from './_lib.js';

const CITIES = [
  ['demo:hyderabad', 'Hyderabad', 'Telangana', 'India', 17.385, 78.4867, 260],
  ['demo:mumbai', 'Mumbai', 'Maharashtra', 'India', 19.076, 72.8777, 320],
  ['demo:delhi', 'New Delhi', 'Delhi', 'India', 28.6139, 77.209, 230],
  ['demo:bengaluru', 'Bengaluru', 'Karnataka', 'India', 12.9716, 77.5946, 180],
  ['demo:kolkata', 'Kolkata', 'West Bengal', 'India', 22.5726, 88.3639, 120],
  ['demo:dhaka', 'Dhaka', 'Dhaka', 'Bangladesh', 23.8103, 90.4125, 90],
  ['demo:karachi', 'Karachi', 'Sindh', 'Pakistan', 24.8607, 67.0011, 80],
  ['demo:dubai', 'Dubai', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708, 60],
  ['demo:london', 'London', 'England', 'United Kingdom', 51.5074, -0.1278, 140],
  ['demo:paris', 'Paris', 'Île-de-France', 'France', 48.8566, 2.3522, 70],
  ['demo:lagos', 'Lagos', 'Lagos', 'Nigeria', 6.5244, 3.3792, 110],
  ['demo:cairo', 'Cairo', 'Cairo', 'Egypt', 30.0444, 31.2357, 75],
  ['demo:nairobi', 'Nairobi', 'Nairobi', 'Kenya', -1.2921, 36.8219, 40],
  ['demo:newyork', 'New York', 'New York', 'United States', 40.7128, -74.006, 150],
  ['demo:la', 'Los Angeles', 'California', 'United States', 34.0522, -118.2437, 95],
  ['demo:toronto', 'Toronto', 'Ontario', 'Canada', 43.6532, -79.3832, 55],
  ['demo:mexico', 'Mexico City', 'CDMX', 'Mexico', 19.4326, -99.1332, 85],
  ['demo:saopaulo', 'São Paulo', 'São Paulo', 'Brazil', -23.5505, -46.6333, 130],
  ['demo:jakarta', 'Jakarta', 'Jakarta', 'Indonesia', -6.2088, 106.8456, 100],
  ['demo:manila', 'Manila', 'Metro Manila', 'Philippines', 14.5995, 120.9842, 65],
  ['demo:tokyo', 'Tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503, 45],
  ['demo:sydney', 'Sydney', 'New South Wales', 'Australia', -33.8688, 151.2093, 35],
  ['demo:istanbul', 'Istanbul', 'Istanbul', 'Türkiye', 41.0082, 28.9784, 50],
  ['demo:berlin', 'Berlin', 'Berlin', 'Germany', 52.52, 13.405, 30],
];
const CC = { India: 'IN', Bangladesh: 'BD', Pakistan: 'PK', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB', France: 'FR', Nigeria: 'NG', Egypt: 'EG',
  Kenya: 'KE', 'United States': 'US', Canada: 'CA', Mexico: 'MX', Brazil: 'BR', Indonesia: 'ID', Philippines: 'PH', Japan: 'JP', Australia: 'AU', 'Türkiye': 'TR', Germany: 'DE' };
let n = 0;
const houses = [];
for (const [geoId, name, admin1, country, lat, lon, count] of CITIES) {
  for (let i = 0; i < count; i++) houses.push({ id: `demo.${String(++n).padStart(4, '0')}`, place: { geoId, name, admin1, country, cc: CC[country] || '', lat, lon } });
}
// Spread move-in times over the last 12 days so houses show every growth stage.
const now = Date.now();
for (const h of houses) h.t = now - Math.pow(Math.random(), 1.6) * 12 * 86400000;
houses.sort((a, b) => a.t - b.t);
console.log(await bulk(houses));
