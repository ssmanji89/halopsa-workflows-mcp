#!/bin/bash
# Enhanced startup script with better error handling and automatic recovery

# Configuration
MAX_RESTARTS=5
RESTART_DELAY=5
LOG_DIR="${HOME}/Library/Logs/Claude"
LOG_FILE="${LOG_DIR}/mcp-server-halopsa-workflow.log"

# Ensure log directory exists with proper permissions
mkdir -p "${LOG_DIR}"
chmod 755 "${LOG_DIR}"
echo "[$(date)] Starting logger in ${LOG_DIR}" >&2

# Enhanced trap for graceful shutdown
cleanup() {
  echo "Caught signal, shutting down..." >&2
  
  # If we have a server PID, try to terminate it gracefully
  if [ -n "${server_pid}" ] && ps -p "${server_pid}" > /dev/null; then
    echo "Sending SIGTERM to PID ${server_pid}" >&2
    kill -TERM "${server_pid}" 2>/dev/null || true
    
    # Wait up to 5 seconds for graceful termination
    for i in {1..10}; do
      if ! ps -p "${server_pid}" > /dev/null; then
        echo "Server process terminated gracefully" >&2
        break
      fi
      sleep 0.5
    done
    
    # Force kill if still running
    if ps -p "${server_pid}" > /dev/null; then
      echo "Server not responding to SIGTERM, sending SIGKILL" >&2
      kill -KILL "${server_pid}" 2>/dev/null || true
    fi
  else
    # If we don't have a specific PID, try to find all related processes
    echo "Attempting to find and terminate all related processes" >&2
    pkill -f "halopsa-workflows-mcp" || true
  fi
  
  echo "Shutdown complete" >&2
  exit 0
}

# Register trap for signals
trap cleanup SIGINT SIGTERM SIGQUIT

# Initialize counter
restart_count=0

# Start the server with automatic restart on failure
start_server() {
  echo "Starting HaloPSA Workflow MCP Server (attempt ${restart_count}/${MAX_RESTARTS})..."
  
  # Set NODE_OPTIONS to enable garbage collection
  export NODE_OPTIONS="--expose-gc"
  
  # Increase the maximum old space size to avoid memory issues
  export NODE_OPTIONS="${NODE_OPTIONS} --max-old-space-size=512"
  
  # Run in production mode
  # Use tee to split output to both stderr and log file if log file is not stderr
  if [ "${LOG_FILE}" != "/dev/stderr" ]; then
    NODE_ENV=production node dist/index.js 2>&1 | tee -a "${LOG_FILE}" >&2 &
  else
    NODE_ENV=production node dist/index.js 2>&1 &
  fi
  server_pid=$!
  
  # Log the PID
  echo "Server started with PID ${server_pid}" >&2
  
  # Wait for process to finish
  wait $server_pid
  
  # Check exit status
  exit_status=$?
  if [ $exit_status -eq 0 ]; then
    echo "Server exited cleanly."
    exit 0
  else
    echo "Server crashed with exit code ${exit_status}"
    
    # Check for specific EPIPE errors in the log
    if grep -q "EPIPE" "${LOG_FILE}" 2>/dev/null; then
      echo "Detected EPIPE errors - this is expected during normal Claude shutdown"
      
      # If this was the only error, don't count it as a real restart attempt
      if [ $restart_count -gt 0 ]; then
        ((restart_count--))
      fi
    fi
    
    # Increment restart counter
    ((restart_count++))
    
    # Calculate exponential backoff delay
    current_delay=$((RESTART_DELAY * restart_count))
    if [ $current_delay -gt 30 ]; then
      current_delay=30  # Cap at 30 seconds
    fi
    
    if [ $restart_count -lt $MAX_RESTARTS ]; then
      echo "Restarting in ${current_delay} seconds..."
      sleep $current_delay
      # Restart server
      start_server
    else
      echo "Maximum restart attempts reached (${MAX_RESTARTS}). Exiting."
      exit 1
    fi
  fi
}

# Ensure we're in the project directory
cd "$(dirname "$0")" || { echo "Error: Could not change directory to project root"; exit 1; }

# Build the project if needed
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
  echo "Building project..."
  npm run build
  if [ $? -ne 0 ]; then
    echo "Error: Build failed. Please check for errors."
    exit 1
  fi
fi

# Check if we need to clean up stale processes
if pgrep -f "halopsa-workflows-mcp" > /dev/null; then
  echo "Found stale halopsa-workflows-mcp processes. Cleaning up..."
  pkill -f "halopsa-workflows-mcp" || true
  
  # Wait a moment for processes to terminate
  sleep 2
  
  # If any remain, force kill them
  if pgrep -f "halopsa-workflows-mcp" > /dev/null; then
    echo "Force killing remaining processes..."
    pkill -9 -f "halopsa-workflows-mcp" || true
  fi
fi

# Create a clean log file, making sure the directory exists
if [ ! -d "${LOG_DIR}" ]; then
  echo "Creating log directory ${LOG_DIR}" >&2
  mkdir -p "${LOG_DIR}"
  chmod 755 "${LOG_DIR}"
fi

# Create the log file with error handling
if touch "${LOG_FILE}" 2>/dev/null; then
  echo "Starting HaloPSA Workflow MCP Server at $(date)" > "${LOG_FILE}"
  echo "Log file created at ${LOG_FILE}" >&2
else
  echo "Warning: Unable to create log file at ${LOG_FILE}. Using stderr only." >&2
  # Set log file to /dev/stderr as fallback
  LOG_FILE="/dev/stderr"
fi

# Start the server
start_server

# Keep the script running to maintain the server process
while true; do
  sleep 60
done
