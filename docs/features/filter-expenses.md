# Feature — Filter and navigate expenses

Status: Implemented locally.

The expense list can be filtered by one calendar month (`YYYY-MM`) and one category. Both filters are optional and combine when selected. The default shows all dates and categories. Results keep the existing order: occurrence date descending, creation time descending, then id.

`GET /api/expenses` accepts `month`, `category` and a one-based `page`. Invalid, repeated or unknown parameters return 400. The backend returns at most 20 records per page, the filtered record count, current page and whether another page exists. Previous and next controls let the user navigate. An empty result has a distinct message from an empty database.

The summary card remains the total of the current Buenos Aires month across all categories, independent of list filters. Creating, editing or deleting a record refreshes the selected list page and summary from PostgreSQL.

Verification: unit tests cover query rules and calendar boundaries; integration tests check combined filtering, order, count and paging; a browser test changes filters and navigates results.
