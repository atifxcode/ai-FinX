# AI-FINX

Personal finance dashboard with a React/Vite frontend and a Node/Express backend.

## Project structure

- `backend/` - Express + TypeScript API server
- `client/` - Vite + React frontend application

## Setup instructions

### Backend

1. Open a MongoDB Atlas account and create a cluster.
2. Create a database user and whitelist your local IP or allow access from your environment.
3. Copy your Atlas connection string and set it in `backend/.env` as:

```env
MONGO_URI="mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority"
```

4. Install dependencies:

```bash
cd backend
npm install
```

5. Start the backend server:

```bash
npm run dev
```

### Frontend

1. Install dependencies:

```bash
cd client
npm install
```

2. Start the frontend app:

```bash
npm run dev
```

3. Open the displayed local URL in your browser (usually `http://localhost:5173`).

## Notes

- The backend needs only the MongoDB Atlas connection string in `MONGO_URI` to connect.
- Additional backend environment variables may be required for authentication or third-party services, but the main connection is via Atlas.

## Screenshots

<img width="1499" height="829" alt="image" src="https://github.com/user-attachments/assets/362cf26a-6d73-47de-abcf-907a9408bbff" />
<img width="1765" height="982" alt="image" src="https://github.com/user-attachments/assets/8437f03f-a6f8-484a-a888-e28d920b2411" />


