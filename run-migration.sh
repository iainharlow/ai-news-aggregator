#!/bin/bash

# Simple script to run the database migration
cd ./server && node migrations/add_summary_fields.js
node migrations/migrate.js

# Notify user
echo "Migration completed!"
