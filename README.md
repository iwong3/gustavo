# spend-tracker

A tool to track spend.

## Summary

A simple web app hosted on Github Pages.
Provides a UI to allow users to read and write to a Google Sheet.

## Technical Planning

- Spin up a React app
- Run it locally
- Deploy it to Github pages
- Obtain Google Sheets API
- Display data from a Google Sheet
- Be able to write data to a Google Sheet
- Plan a UI to read/write data
  - Functionality
    - Add a spend
    - Select who to split cost between
    - Edit a spend
    - Delete a spend
    - View spend per person
  - Bonus Functionality
    - Sort and filter spends in rows and in summary
    - Add a person
    - Delete a person
  - Mobile friendly viewing
- How do we make this resilient against user error?
  - What if someone accidentally deletes all rows?
  - What if a bad actor deletes all rows?

## Resources

- https://developers.google.com/sheets/api/guides/concepts

## Technical Ideas

- How do we handle multiple users making edits at the same time?
  - Look into web sockets (this may require a server)
- How do we refresh every time someone makes an update?
- Can we provide a read-only version for everyone else besides me?
- Refresh buttons?
- Or look into GCP free tier for hosting a server.
  - Check out Firebase free tier.
