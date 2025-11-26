#!/bin/bash

echo "========================================"
echo "  MONITIXE Server Launcher"
echo "========================================"
echo ""
echo "Starting local web server..."
echo ""
echo "Once started, open your browser to:"
echo "  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
    exit 0
fi

# Try Python 2
if command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
    exit 0
fi

# If Python not found
echo "ERROR: Python is not installed"
echo ""
echo "Please install Python or use another method from START_SERVER.md"
echo ""
echo "On Mac: brew install python3"
echo "On Ubuntu/Debian: sudo apt-get install python3"
echo ""
