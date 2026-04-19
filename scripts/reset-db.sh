#!/bin/bash
# Reset database (DANGER: deletes all data)
echo 'This will delete all data. Press Ctrl+C to cancel...'
sleep 5
psql $DATABASE_URL -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
npm run migrate
