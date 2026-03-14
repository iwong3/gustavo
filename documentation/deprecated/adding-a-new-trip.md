# DEPRECATED

This was for the old Gustavo app that lived on Github Pages and ingested data
from Google Sheets populated via Google Forms.

# Guide: Adding a New Trip

This document outlines all the steps required to add a new trip to the app.

## Files to Update

### 1. `src/helpers/trips.ts`

Add the new trip to the `Trip` enum and assign it to either `ActiveTrips` or
`PastTrips`.

```typescript
export enum Trip {
    // ... existing trips
    YourNewTrip = 'Your New Trip',
}

export const ActiveTrips = [Trip.YourNewTrip, ...] // or add to PastTrips
export const PastTrips = [..., Trip.YourNewTrip]
```

### 2. `src/helpers/data-mapping.ts`

Add the Google Form and Google Sheet URLs for the new trip in the `UrlsByTrip`
Map.

```typescript
[
    Trip.YourNewTrip,
    {
        GoogleFormUrl: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform',
        GoogleSheetUrl: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID',
        ItineraryUrl: 'https://docs.google.com/document/d/YOUR_DOC_ID/edit?usp=sharing', // Optional
        GoogleMapsListUrl: 'https://maps.app.goo.gl/YOUR_MAP_ID', // Optional
    },
],
```

**Important:** Make sure your Google Sheet is set to "Anyone with the link" →
"Viewer" permissions, otherwise you'll get CORS errors.

### 3. `src/views/trips.tsx`

1. Import the trip image at the top of the file:

```typescript
import YourNewTripImage from '../images/your-new-trip.jpg'
```

2. Add a case in the `getBackgroundImageUrlForTrip` function:

```typescript
const getBackgroundImageUrlForTrip = (trip: Trip) => {
    switch (trip) {
        // ... existing cases
        case Trip.YourNewTrip:
            return YourNewTripImage
        default:
            return ''
    }
}
```

### 4. `src/helpers/person.ts`

Add the list of people participating in the trip in the `PeopleByTrip` object.

```typescript
export const PeopleByTrip = {
    // ... existing trips
    [Trip.YourNewTrip]: [
        Person.Person1,
        Person.Person2,
        // ... add all participants
    ],
}
```

**Note:** If a person doesn't exist in the `Person` enum, add them first.

### 5. `src/helpers/location.ts`

Add the locations for the new trip in the `LocationByTrip` object.

```typescript
export const LocationByTrip = {
    // ... existing trips
    [Trip.YourNewTrip]: [
        Location.Location1,
        Location.Location2,
        Location.Other, // Usually include "Other" as an option
    ],
}
```

**Note:** If a location doesn't exist in the `Location` enum, add it first and
also add its abbreviation in `getLocationAbbr`.

### 6. `src/helpers/links.ts`

Add links for the new trip in the `LinksByTrip` Map. Common links include:

- Itinerary (Google Doc)
- Google Maps List
- Submit Receipt (Google Form)
- Spend Data (Google Sheet)

```typescript
[
    Trip.YourNewTrip,
    [
        {
            name: 'Itinerary',
            url: UrlsByTrip.get(Trip.YourNewTrip)!.ItineraryUrl!,
            personal: true,
            type: LinkType.GoogleDoc,
        },
        {
            name: 'Google Maps List',
            url: UrlsByTrip.get(Trip.YourNewTrip)!.GoogleMapsListUrl!,
            personal: true,
            type: LinkType.GoogleMap,
        },
        {
            name: 'Submit Receipt',
            url: UrlsByTrip.get(Trip.YourNewTrip)!.GoogleFormUrl,
            personal: true,
            type: LinkType.GoogleForm,
        },
        {
            name: 'Spend Data',
            url: UrlsByTrip.get(Trip.YourNewTrip)!.GoogleSheetUrl + ViewPath,
            personal: true,
            type: LinkType.GoogleSheet,
        },
    ],
],
```

### 7. Add Trip Image

Add the trip image file to `src/images/` directory.

- Recommended format: `.jpg` or `.png`
- Recommended naming: `trip-name-year.jpg` (e.g., `japan-2025.jpg`)
- The image will be used as the background for the trip card in the trips menu

## Google Sheets Setup

### Required Columns

Your Google Sheet must have these columns (in any order):

- `Item Name`
- `Date`
- `Cost`
- `Currency`
- `Converted Cost`
- `Paid By`
- `Split Between`
- `Location`
- `Type of Spend`
- `Notes`
- `Email Address`
- `Timestamp`
- `Upload Receipt`

### Sharing Permissions

**Critical:** The Google Sheet must be shared with "Anyone with the link" →
"Viewer" permissions. Otherwise, the app will get CORS errors when trying to
fetch data.

To set this:

1. Open your Google Sheet
2. Click "Share" button (top right)
3. Under "Get link", change to "Anyone with the link"
4. Set role to "Viewer"
5. Click "Done"

### Testing

After making all changes:

1. Test the CSV export URL directly in your browser:
    - `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv`
    - Should download a CSV file, not redirect to login
2. Reload your app and try selecting the new trip
3. Verify that data loads correctly
4. Test adding a new expense and verify calculations work

## Checklist

- [ ] Added trip to `Trip` enum in `src/helpers/trips.ts`
- [ ] Added trip to `ActiveTrips` or `PastTrips` in `src/helpers/trips.ts`
- [ ] Added Google Form and Sheet URLs in `src/helpers/data-mapping.ts`
- [ ] Added optional Itinerary and Maps URLs in `src/helpers/data-mapping.ts`
- [ ] Added image import in `src/views/trips.tsx`
- [ ] Added image case in `getBackgroundImageUrlForTrip` in
      `src/views/trips.tsx`
- [ ] Added people list in `src/helpers/person.ts`
- [ ] Added locations in `src/helpers/location.ts`
- [ ] Added links in `src/helpers/links.ts`
- [ ] Added trip image file to `src/images/`
- [ ] Set Google Sheet to "Anyone with the link" → "Viewer"
- [ ] Tested CSV export URL works
- [ ] Tested trip loads in app
- [ ] Tested expense calculations work correctly

## Manual Steps

- In the Google Sheet, you'll have to add a new column "Converted Cost" which
  will always convert the cost of an item to USD for that given day using the
  Google Finance API. Reference existing Google Sheets to get the formula.
- Make sure to update the app version before deploying!
