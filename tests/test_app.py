from app.app import app


def test_index_returns_welcome_message():
    response = app.test_client().get("/")

    assert response.status_code == 200
    assert response.get_json() == {"message": "Welcome to the backend API"}


def test_health_returns_ok_status():
    response = app.test_client().get("/health")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}
