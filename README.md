# next-25-demo

Board game demo for Google Cloud Next 2025

## Backend

```sh
cd backend
```

To build the backend container:

```sh
gcloud builds submit --region=us-central1 --tag us-central1-docker.pkg.dev/data-connect-demo7/backend-image/backend:latest
```

To deploy the Cloud Run service:

```sh
gcloud run deploy backend-service \
    --image us-central1-docker.pkg.dev/data-connect-demo7/backend-image/backend:latest \
    --service-account backend-sa \
    --update-secrets INSTANCE_CONNECTION_NAME=INSTANCE_CONNECTION_NAME:latest,DB_USER=DB_USER:latest,DB_PASSWORD=DB_PASSWORD:latest,DB_NAME=DB_NAME:latest,MERRIAM_WEBSTER_API_KEY=MERRIAM_WEBSTER_API_KEY:latest \
    --allow-unauthenticated
```
