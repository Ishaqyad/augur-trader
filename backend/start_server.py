#!/usr/bin/env python3
import uvicorn

if __name__ == '__main__':
    print("Starting API Server...")
    print("Server will be available at http://localhost:5000")
    print("\nPress Ctrl+C to stop the server\n")
    uvicorn.run("api_server:app", host="0.0.0.0", port=5000, reload=True)

