#!/bin/bash
curl -X OPTIONS -I \
  -H "Origin: https://clientportal.replit.app" \
  -H "Access-Control-Request-Method: GET" \
  https://staffportal.replit.app/api/public/lenders