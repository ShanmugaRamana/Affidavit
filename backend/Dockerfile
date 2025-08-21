# /backend/Dockerfile

# 1. Start from an official Python base image
FROM python:3.10-slim

# The 'apt-get install' command for swig and build-essential is no longer needed

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy the requirements file and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the rest of your backend application code
COPY . .

# 5. Define the command to run your application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]