import uuid
from types import SimpleNamespace

from backend.app.main import resolve_request_user_context
from backend.app.utils import route_helpers


def test_non_logged_in_user_has_guest_context():
    request = SimpleNamespace(session={})

    user_context = resolve_request_user_context(request)

    assert user_context["is_guest"] is True
    assert user_context["user_id"] is not None


def test_migrate_guest_document_to_user_moves_pdf_to_account(monkeypatch):
    guest_user_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())
    request = SimpleNamespace(session={"guest_user_id": guest_user_id, "guest_document_id": document_id})
    guest_documents = {
        guest_user_id: {
            document_id: {
                "id": document_id,
                "filename": "guest.pdf",
                "bytes": b"%PDF-1.4 test",
            }
        }
    }

    created = {}

    def fake_get_or_create_document(client, db, user_id, file, pdf_bytes):
        created["user_id"] = user_id
        created["file_name"] = file.filename
        created["pdf_bytes"] = pdf_bytes
        return SimpleNamespace(id=uuid.uuid4())

    monkeypatch.setattr(route_helpers, "get_or_create_document", fake_get_or_create_document)

    result = route_helpers.migrate_guest_document_to_user(
        guest_documents,
        request,
        SimpleNamespace(),
        uuid.uuid4(),
        None,
    )

    assert result is not None
    assert created["file_name"] == "guest.pdf"
    assert created["pdf_bytes"] == b"%PDF-1.4 test"
    assert "guest_user_id" not in request.session
    assert "guest_document_id" not in request.session
    assert guest_user_id not in guest_documents
