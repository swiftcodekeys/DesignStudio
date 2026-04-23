#!/bin/bash
#
# Serves the design studio on http://localhost:8000
#
# This is a simple server for local development. It is not intended for production use.
# It uses Python's built-in HTTP server. If you don't have Python installed, you can
# use any other local server. The key is to serve the project root directory.

PORT=8000
PY_VERSION=$(python -V 2>&1)

if [[ $PY_VERSION == *"Python 3"* ]]; then
  echo "Starting Python 3 server on port $PORT"
  python -m http.server $PORT
else
  echo "Starting Python 2 server on port $PORT"
  python -m SimpleHTTPServer $PORT
fi