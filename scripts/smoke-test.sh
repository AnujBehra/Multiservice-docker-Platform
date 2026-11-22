#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

echo "Checking health at ${BASE_URL}/health"
HEALTH="$(curl -fsS "${BASE_URL}/health")"
echo "Health: ${HEALTH}"

echo "Creating sample todo"
CREATE_RESPONSE="$(curl -fsS -X POST "${BASE_URL}/api/todos" -H 'Content-Type: application/json' -d '{"title":"smoke test todo"}')"
echo "Create response: ${CREATE_RESPONSE}"

echo "Fetching todo list"
LIST_RESPONSE="$(curl -fsS "${BASE_URL}/api/todos")"
echo "List response: ${LIST_RESPONSE}"

TODO_ID="$(printf '%s' "${CREATE_RESPONSE}" | node -e 'let input=""; process.stdin.on("data", d => input += d); process.stdin.on("end", () => process.stdout.write(String(JSON.parse(input).id)));')"

echo "Marking todo ${TODO_ID} complete"
UPDATE_RESPONSE="$(curl -fsS -X PATCH "${BASE_URL}/api/todos/${TODO_ID}" -H 'Content-Type: application/json' -d '{"completed":true}')"
echo "Update response: ${UPDATE_RESPONSE}"

echo "Deleting todo ${TODO_ID}"
curl -fsS -X DELETE "${BASE_URL}/api/todos/${TODO_ID}" >/dev/null

echo "Smoke test completed successfully."
