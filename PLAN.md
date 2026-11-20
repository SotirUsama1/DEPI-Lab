# Library Management System: Three-Layer Architecture Plan

## Goal

Create a registration and login library management system with a three-layer architecture. The work ends after creating a Docker image for each layer. Do not deploy the images or application.

## Requirements from the project brief

- Register users with a name, email, and password.
- Log in with email and password, log out, and show useful errors for invalid credentials.
- Display a catalogue of books with title, author, category, cover image, price, total quantity, available quantity, and borrowing availability.
- Support the brief's Buy and Borrow actions, plus returning borrowed books. Buy records a purchase in the system; no payment service is used.
- Persist users, books, inventory, and transactions.

## Layers

### 1. Presentation layer — frontend

- Provide registration, login, logout, and book catalogue screens.
- Show book details and availability, and provide Buy and Borrow actions.
- Show validation, authentication, and action errors clearly.
- Communicate with the backend through its HTTP API; do not connect directly to MongoDB.
- Use React and produce a standalone Docker image for the frontend.

### 2. Application layer — backend API

- Provide registration, login, logout/session, catalogue, inventory, purchase, borrowing, and return operations.
- Validate input and credentials, enforce inventory rules, and record each action.
- Hash passwords and protect authenticated operations.
- Read and write data through the MongoDB data layer.
- Use Python with Flask and produce a standalone Docker image for the backend.

### 3. Data layer — MongoDB

- Persist users, books, inventory quantities, and transaction/loan records.
- Keep database credentials and connection configuration outside the image.
- Use MongoDB's lightweight Community Server image `mongodb/mongodb-community-server:8.0.38-ubi9-slim` as the data layer and produce a project image from it.

## Delivery sequence

1. Define the API and MongoDB document shapes for users, books, and transactions. **Done.**
2. Implement the frontend, backend, and MongoDB configuration for local use. **Done.**
3. Add a Dockerfile for each layer and document required configuration. **Done.**
4. Build and identify the three Docker images. **Done.** Work stopped here; the app and images were not deployed or started.

## Confirmed decisions

- Frontend framework: React.
- Backend framework: Python with Flask.
- Buy behavior: record the purchase; do not integrate payment services.
- MongoDB image: `mongodb/mongodb-community-server:8.0.38-ubi9-slim`.

The implementation is in [`app/`](app/). See [`app/README.md`](app/README.md) for image names, local run instructions, and the API overview.
