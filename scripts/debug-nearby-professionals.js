require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modals/user-modals');

const DEFAULT_RADIUS_KM = 10;

const toFloatOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const minsAgo = (date) => {
  if (!date) return null;
  return Math.round(((Date.now() - new Date(date).getTime()) / 60000) * 10) / 10;
};

async function main() {
  const lat = toFloatOrNull(process.argv[2]);
  const lng = toFloatOrNull(process.argv[3]);
  const radiusKm = toFloatOrNull(process.argv[4]) || DEFAULT_RADIUS_KM;
  const hasPatientLocation = lat != null && lng != null;

  await mongoose.connect(process.env.MONGODB_URI);

  const caregivers = await User.find({ userType: { $in: ['nurse', 'caretaker'] } })
    .select('fullName email userType isApproved isVerified isAvailable lastActive createdAt location locationUpdatedAt locationAccuracy specialty licenseNumber')
    .sort({ createdAt: 1 })
    .lean();

  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const rows = caregivers.map((c) => {
    const reasons = [];
    if (!c.isApproved) reasons.push('not_approved');
    if (!c.isVerified) reasons.push('not_verified');
    if (!c.isAvailable) reasons.push('not_available');
    if (!c.lastActive || new Date(c.lastActive) < ninetySecondsAgo) reasons.push('stale_lastActive');

    let distanceKm = null;
    const coords = c.location?.coordinates;
    const hasCoords = Array.isArray(coords) && coords.length >= 2;
    const caregiverLng = hasCoords ? toFloatOrNull(coords[0]) : null;
    const caregiverLat = hasCoords ? toFloatOrNull(coords[1]) : null;

    if (hasPatientLocation) {
      if (!c.locationUpdatedAt || new Date(c.locationUpdatedAt) < twoMinutesAgo) reasons.push('stale_locationUpdatedAt');
      const acc = c.locationAccuracy;
      const accOk = acc == null || Number.isFinite(acc) && acc <= 80;
      if (!accOk) reasons.push('bad_locationAccuracy');

      if (caregiverLat == null || caregiverLng == null) {
        reasons.push('missing_coords');
      } else if (caregiverLat === 0 && caregiverLng === 0) {
        reasons.push('zero_coords');
      } else {
        distanceKm = haversineDistanceKm(lat, lng, caregiverLat, caregiverLng);
        if (distanceKm > radiusKm) reasons.push('outside_radius');
      }
    }

    return {
      name: c.fullName,
      email: c.email,
      type: c.userType,
      approved: c.isApproved,
      verified: c.isVerified,
      available: c.isAvailable,
      lastActiveMinAgo: minsAgo(c.lastActive),
      locationUpdatedMinAgo: minsAgo(c.locationUpdatedAt),
      locationAccuracy: c.locationAccuracy,
      coords: hasCoords ? `${coords[1]},${coords[0]}` : null,
      distanceKm,
      included: reasons.length === 0,
      reasons: reasons.join('|') || 'included',
      createdAt: c.createdAt,
    };
  });

  console.log('\n=== Nearby Professionals Debug ===');
  console.log(`Total caregivers: ${rows.length}`);
  console.log(`Patient location mode: ${hasPatientLocation ? `${lat}, ${lng} radius=${radiusKm}km` : 'NO LOCATION (list mode)'}`);
  console.table(rows);

  const included = rows.filter((r) => r.included);
  const excluded = rows.filter((r) => !r.included);
  console.log(`Included: ${included.length}`);
  console.log(`Excluded: ${excluded.length}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
