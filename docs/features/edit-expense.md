# Feature — Edit a manual expense

Status: Implemented locally.

An existing manual expense can be edited from the list. The form starts with its saved amount, civil date, category, payment method, merchant and description. Saving replaces all six editable values; cancelling leaves the record unchanged.

The application validates the complete input with the same rules used for creation. `PUT /api/expenses/{id}` returns the updated DTO, 400 with field errors for invalid input, 404 for an absent or malformed id, and generic 500 feedback for unexpected failures. The backend retains the id, currency, source and created timestamp; `updatedAt` changes on a successful edit.

After success, the list and current-month total are refreshed from PostgreSQL. A date change across a month boundary affects the appropriate total. A failed request preserves form values and does not claim the edit was saved.

Verification: domain validation remains covered; integration tests check update/readback, immutable fields, invalid input, missing records and total changes; a browser test edits and reloads an expense.
