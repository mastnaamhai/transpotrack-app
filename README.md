# TranspoTrack - Transport Management Application

TranspoTrack is a comprehensive web application designed to help transportation and logistics companies manage their operations efficiently. It includes features for managing clients, lorry receipts (LRs), invoices, supplier trips, and financial ledgers.

This application is built with a React frontend and a Node.js (Express) backend.

## Prerequisites

- **Node.js** (v18 or later)
- **npm**
- **Docker** and **Docker Compose** (for containerized setup)

## Running the Application with Docker (Recommended)

This is the easiest way to get the application running locally.

### 1. Configuration

Before starting the application, you need to configure the backend's environment variables.

- Create a file named `.env` inside the `backend/` directory:
  ```
  backend/.env
  ```
- Add your MongoDB connection string to this file, like so:
  ```env
  MONGODB_URI=mongodb+srv://your_user:your_password@your_cluster.mongodb.net/your_database?retryWrites=true&w=majority
  ```
  **Note:** Ensure your MongoDB Atlas cluster has IP Whitelisting configured to allow connections from your IP, or from anywhere (`0.0.0.0/0`) for development.

### 2. Build and Run

Once the `.env` file is configured, you can start the entire application with a single command from the project root:

```bash
docker-compose up --build
```

This command will:
- Build the Docker image for the frontend service.
- Build the Docker image for the backend service.
- Start containers for both services.

### 3. Accessing the Application

- **Frontend:** [http://localhost:8080](http://localhost:8080)
- **Backend API:** [http://localhost:5001](http://localhost:5001)

To stop the application, press `Ctrl + C` in the terminal where `docker-compose` is running, and then run `docker-compose down`.

## Running Locally (Without Docker)

You can also run the frontend and backend services separately without Docker.

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create and configure the `.env` file as described in the Docker setup section.
4.  Start the backend server:
    ```bash
    npm start
    ```
    The backend will be running at `http://localhost:5001`.

### Frontend Setup

1.  In a separate terminal, navigate to the project root directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:5173`.
