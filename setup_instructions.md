## Local Setup Instructions

Augur Trader runs locally with separate frontend and backend servers. Both must be running at the same time.

---

### Dependencies

- Node.js (v18 or newer)
- Python (v3.10 or newer)

---

### Backend Setup 

1. Open a terminal and navigate to the backend folder:

   ```bash
   cd backend
   ```

2. (Optional) Create and activate a virtual environment.

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:

   ```bash
   uvicorn api_server:app --reload
   ```

5. The backend will run at:

   ```
   http://127.0.0.1:8000
   ```

Leave this terminal running.

---

### Frontend Setup 

1. Open a new terminal and navigate to the frontend folder:

   ```bash
   cd frontend
   ```

2. Install Node dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app in your browser at:

   ```
   http://localhost:5173
   ```

---

### Running the App

- Ensure both servers are running.
- Load a stock ticker and date range in TradeView to begin using the platform.
- Trades, positions, and logs update automatically during use.

---

### Troubleshooting

- If no data loads, verify the backend server is running.
- If the frontend fails to connect, check API URLs and ports.
- Restart both servers if dependency errors occur.
