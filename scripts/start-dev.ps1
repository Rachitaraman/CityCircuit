# Start frontend and backend in separate PowerShell windows
# Usage: powershell -File ./scripts/start-dev.ps1

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd \"$PWD\"; npm run dev"

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd \"$PWD\"; cd ML/server; if (Test-Path .\venv) { .\venv\Scripts\Activate.ps1 }; python app.py"
