/* Nominatim geocode → server /api/places (Foursquare) */

async function geocode(street, suburb, city) {
  const queries = [
    [street, suburb, city, "South Africa"].filter(Boolean).join(", "),
    [suburb, city, "South Africa"].filter(Boolean).join(", "),
  ];
  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=za`;
    const res = await fetch(url, { headers: { "User-Agent": "NearbyDoc/1.0" } });
    const data = await res.json().catch(() => []);
    if (Array.isArray(data) && data.length) {
      console.log(`[Geocode] "${q}" → ${data[0].lat}, ${data[0].lon}`);
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  }
  throw new Error(`Location not found: ${[suburb, city].filter(Boolean).join(", ")}`);
}

export async function findDoctors(location, _cityName, specialty, radius) {
  const { lat, lng } = await geocode(location.street, location.suburb, location.city);

  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng, radius, specialty }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Server error (HTTP ${res.status})`);

  const doctors = data.doctors || [];
  if (doctors.length === 0) throw new Error("No results found. Try a larger radius.");
  return doctors;
}
