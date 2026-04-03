#!/bin/bash
# Create a new school
curl -X POST $API_URL/api/superadmin/schools \
  -H 'Authorization: Bearer '$SUPER_TOKEN \
  -H 'Content-Type: application/json' \
  -d '{"name":"My School","code":"SCH001"}'
