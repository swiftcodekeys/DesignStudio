#!/bin/bash
#
# This script is used to diagnose issues with the gate tool.
# It starts a mitmproxy instance and opens the gate tool in a new browser window.
# The HAR file can be used to analyze the network requests made by the gate tool.
#
# Usage: ./diagnose.sh
#
# The HAR file will be saved as "gate-tool.har".

set -e

# The URL of the gate tool
URL="http://localhost:8000/gate_tool/"

# The name of the HAR file to create
HAR_FILE="gate-tool.har"

# The command to start the browser
# This will vary depending on your operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  BROWSER_CMD="xdg-open"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  BROWSER_CMD="open"
elif [[ "$OSTYPE" == "cygwin" || "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  BROWSER_CMD="start"
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

# Start mitmproxy in the background
# The --set har_dump_file option will cause mitmproxy to write a HAR file
# when it is shut down.
echo "Starting mitmproxy..."
mitmweb --set har_dump_file="$HAR_FILE" &
MITM_PID=$!

# Wait for mitmproxy to start
sleep 3

# Open the browser
echo "Opening browser..."
$BROWSER_CMD "$URL"

# Wait for the user to press Enter
read -p "Press Enter to shut down mitmproxy and save the HAR file..."

# Shut down mitmproxy
echo "Shutting down mitmproxy..."
kill $MITM_PID

echo "HAR file saved to $HAR_FILE"