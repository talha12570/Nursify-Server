# Schema Migration Analysis – Distance-Based Search

## Analysis Result: Minimal Changes Required

Both `User` and `Caregiver` models already have everything needed:

| Field | Model | Status |
|-------|-------|--------|
| `location` (GeoJSON Point) | User, Caregiver | ✅ Exists |
| `2dsphere` index on `location` | User, Caregiver | ✅ Exists |
| `isAvailable` / `availability` | User, Caregiver | ✅ Exists |
| `lastActive` | User | ✅ Exists |
| `hourlyRate` | User, Caregiver | ✅ Exists |
| `rating`, `totalReviews` | User, Caregiver | ✅ Exists |

---

## Only Change Made

### `User.location` — Already Exists, Now Actively Written

The heartbeat endpoint (`POST /api/caregiver/heartbeat`) previously only updated `lastActive`.  
It now **also writes `location.coordinates: [lng, lat]`** when the caregiver's app sends GPS data.

No schema migration is needed — the field already exists with a `2dsphere` index.

---

## Optional Future Enhancements

These fields do not yet exist and can be added if needed:

```js
// In User schema (for more precise location history)
lastKnownAddress: { type: String, default: null },   // reverse-geocoded address
locationAccuracy: { type: Number, default: null },   // GPS accuracy in metres
locationUpdatedAt: { type: Date, default: null },    // timestamp of last GPS fix
```

### Migration Script (run once if you add the optional fields)

```js
// Server/scripts/add-location-fields.js
const mongoose = require('mongoose');
const User = require('../modals/user-modals');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await User.updateMany(
    {
      $or: [{ userType: 'nurse' }, { userType: 'caretaker' }],
      locationUpdatedAt: { $exists: false },
    },
    {
      $set: {
        lastKnownAddress: null,
        locationAccuracy: null,
        locationUpdatedAt: null,
      },
    }
  );

  console.log(`Updated ${result.modifiedCount} caregiver documents.`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
```

Run with:
```bash
cd Server
node scripts/add-location-fields.js
```

---

## How Location Data Flows

```
Caregiver App boots
  └── useLocation hook requests GPS permission
  └── caregiverLocationRef updated with {lat, lng}

Every 5 s: sendHeartbeat()
  └── POST /api/caregiver/heartbeat  { latitude, longitude }
  └── Server writes User.location.coordinates = [lng, lat]
  └── Server writes User.lastActive = now()

Patient App:
  └── useLocation hook gets patient GPS
  └── caregiverSearchService.searchCaregiversWithinRadius(patientLocation)
      └── starts at 1 km, expands to 3, 5, 7, 10 km until results found
      └── GET /api/patient/caregivers/approved?latitude=&longitude=&maxDistanceM=
          └── Server $geoNear aggregation on User collection
          └── Returns caregivers sorted by distance ascending
      └── enrichCaregiversWithDistance()
          └── Google Distance Matrix API (real driving distance)
          └── Haversine fallback if API fails
      └── buildMapMarkers() → caregiver pins for MapView
```
