# Chapter & Co. Library

Three layers: a React/Vite frontend, a Flask API, and MongoDB. The application supports registration, login/logout, catalogue search/category filters, borrowing and returning books, and purchase records. Buy only records the purchase; it does not collect or process payment.

## Build the three Docker images

From this directory, run:

```sh
docker compose build
```

The images are tagged `library-frontend:1.0.0`, `library-backend:1.0.0`, and `library-mongodb:8.0.38-slim`. Building them does not start the services or deploy them.

## Run locally (optional)

Set a private `JWT_SECRET` in your shell, then run `docker compose up`. The frontend is available at <http://localhost:8080> and the API at <http://localhost:5000/api>. MongoDB stays on the internal Docker network and stores its data in the `mongo-data` volume.

MongoDB uses MongoDB Community Server `8.0.38-ubi9-slim`, the publisher's slim UBI 9 image. It is not published to a host port. The database has no authentication in this local-only setup; do not expose this compose network or reuse the development configuration for production.

The first API startup seeds a small sample catalogue when no books exist. Registration creates accounts with hashed passwords. API endpoints requiring a user accept `Authorization: Bearer <token>`.

## API overview

- `POST /api/auth/register` — `{ "name", "email", "password" }`
- `POST /api/auth/login` — `{ "email", "password" }`
- `POST /api/auth/logout` — authenticated
- `GET /api/books?search=&category=` — public catalogue
- `POST /api/books/<bookId>/borrow` — authenticated
- `POST /api/books/<bookId>/buy` — authenticated, records purchase only
- `GET /api/loans`, `POST /api/loans/<loanId>/return` — authenticated loan list and return
- `GET /api/purchases` — authenticated purchase history
- `GET /api/health` — API and MongoDB health
