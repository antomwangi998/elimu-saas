#!/bin/bash
# Backup PostgreSQL database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
