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

echo "Smoke test completed successfully."
