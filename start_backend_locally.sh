
#!/bin/bash
echo "Setting up and starting backend..."

# Navigate to backend
cd backend

# Create venv if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start uvicorn
echo "Starting FastAPI server on port 8000..."
uvicorn main:app --reload --port 8000
