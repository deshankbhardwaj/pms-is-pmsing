#!/bin/bash
# PRISM: double-click to run the app on this Mac (no install needed; uses the Python that ships with macOS).
cd "$(dirname "$0")"
PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo ""
echo "  PRISM is running at http://localhost:$PORT"
echo "  Leave this window open while you use the app. Close it (or press Ctrl+C) to stop."
echo ""
( sleep 1 && open "http://localhost:$PORT" ) &
python3 -m http.server $PORT
