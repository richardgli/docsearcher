from types import SimpleNamespace

from backend.app.main import resolve_request_user_context


def test_non_logged_in_user_has_guest_context():
    request = SimpleNamespace(session={})

    user_context = resolve_request_user_context(request)

    assert user_context["is_guest"] is True
    assert user_context["user_id"] is not None
