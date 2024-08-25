# Service Accounts

## Setting up a computer as a service account

First, create a new service account for your computer
[here](https://console.cloud.google.com/iam-admin/serviceaccounts).

Jot down the service account email.

Next, create a key for your service account.

`gcloud iam service-accounts keys create <NAME_OF_FILE>.json --iam-account <SERVICE_ACCOUNT_EMAIL>`

Move the key JSON to your desired directory.

Set the `GOOGLE_APPLICATION_CREDENTIALS` env var in your shell config or system env vars.
