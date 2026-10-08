# Feature — Delete a manual expense

Status: Implemented locally.

The list offers a delete action with an inline confirmation. Cancelling leaves the record intact. Confirming permanently removes the expense in this local single-user version.

`DELETE /api/expenses/{id}` returns 204 after deletion, 404 for an absent or malformed id, and generic 500 feedback for unexpected failures. The interface refreshes the list and current-month total after success; failures keep the expense visible and show an error.

Verification: integration tests check existing and missing ids plus the persisted total; a browser test checks cancel, confirm and reload. Tests use only the dedicated test database.
