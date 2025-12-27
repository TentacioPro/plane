# Plane Self-Host Setup Guide

This guide provides step-by-step instructions to set up the Plane project management system on your local machine using Docker.

## Prerequisites

Ensure you have the following installed on your system:

- **Git**: [Download Git](https://git-scm.com/downloads)
- **Docker Desktop**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) (Ensure it is running)

## Installation Steps

### 1. Clone the Repository

Open your terminal or command prompt and run:

```bash
git clone https://github.com/TentacioPro/plane.git
cd plane
```

### 2. Configure Environment Variables

The project comes with a pre-configured `docker-compose.yaml` that sets up necessary environment variables. However, you should verify the following:

- **MinIO (Object Storage)**:
  - The `MINIO_EXTERNAL_ENDPOINT_URL` is set to `http://localhost:9000` to ensure file uploads work correctly from your browser.
  - Access Key: `planeadmin`
  - Secret Key: `planeadmin`

- **Unsplash (Optional)**:
  - If you want to use Unsplash for cover images, you can add your Access Key in `docker-compose.yaml` under `UNSPLASH_ACCESS_KEY`.
  - If not configured, the Unsplash tab will be hidden in the UI.

### 3. Start the Application

Run the following command to start all services:

```bash
docker-compose up -d
```

This command will download the necessary Docker images and start the containers in detached mode.

### 4. Access the Application

Once the containers are running, you can access the application in your web browser:

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `planeadmin`, Pass: `planeadmin`)
- **API**: [http://localhost:8000](http://localhost:8000)

### 5. Initial Setup

1. Open [http://localhost:3000](http://localhost:3000).
2. You will be prompted to create an account or sign in.
3. Follow the on-screen instructions to set up your workspace.

## Troubleshooting

### File Uploads Not Working

If you encounter issues with uploading images or files:

- Ensure `MINIO_EXTERNAL_ENDPOINT_URL` is set to `http://localhost:9000` in `docker-compose.yaml`.
- Check if the `plane-minio` container is running and accessible at `http://localhost:9000`.

### Unsplash Images Not Loading

- Verify that `UNSPLASH_ACCESS_KEY` is correctly set in `docker-compose.yaml`.
- If you don't have a key, the Unsplash tab should be hidden automatically.

### Database Connection Issues

- Ensure the `plane-db` container is running.
- Check the logs: `docker-compose logs -f plane-db`

## Stopping the Application

To stop the services, run:

```bash
docker-compose down
```

To stop and remove volumes (WARNING: this deletes all data):

```bash
docker-compose down -v
```
