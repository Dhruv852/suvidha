
FROM python:3.11-slim

WORKDIR /app

# Copy requirement file first for caching
COPY backend/requirements.txt requirements.txt

# Install dependencies
# Using the --extra-index-url to force CPU versions for PyTorch
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend code and data files
COPY backend/ .

# Expose port (Hugging Face expects port 7860 by default for some SDKs, 
# but for Docker spaces we can expose anything. 7860 is standard for HF)
EXPOSE 7860

# Define environment variable for standard HF port
ENV PORT=7860

# Start command using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
