"""Backend tests for AprovaMed Planner - iteration 2.
Covers: auth, profile, dashboard, computed CRUD (questoes/redacoes/simulados),
generic CRUD (tasks/revisoes/schedule/vestibulares/calendario/notas/decks),
conjuntos with auto-template, flashcards (CRUD + due + stats + review SM-2 +
suspend + import), redacao tipo enem/outro, vestibulares com data_prova, and
new dashboard fields (vestibulares_proximos / eventos_proximos /
conjuntos_progress / flashcards_due / flashcards_atrasados).
"""
import os
import uuid
import datetime as dt
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@aprovamed.com"
DEMO_PASSWORD = "demo123"
TODAY = dt.date.today().isoformat()


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Auth ----------
def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_login_demo_works(token):
    assert isinstance(token, str) and len(token) > 20


def test_register_and_me():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Tester"}, timeout=15)
    assert r.status_code == 200
    tk = r.json()["token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tk}"}, timeout=15)
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_me_unauth():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# ---------- Dashboard (new fields) ----------
def test_dashboard_new_fields(auth):
    r = requests.get(f"{API}/dashboard", headers=auth, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in [
        "tasks_today", "revisoes_pendentes", "questoes_semana",
        "ultima_redacao", "ultimo_simulado", "dias_restantes",
        "vestibulares_proximos", "eventos_proximos",
        "conjuntos_progress", "flashcards_due", "flashcards_atrasados",
    ]:
        assert k in d, f"missing {k}"
    assert isinstance(d["vestibulares_proximos"], list)
    assert isinstance(d["eventos_proximos"], list)
    assert isinstance(d["conjuntos_progress"], list)
    assert isinstance(d["flashcards_due"], int)
    # Demo user has 3 vestibulares with data_prova
    assert len(d["vestibulares_proximos"]) >= 1
    v0 = d["vestibulares_proximos"][0]
    assert "dias_restantes" in v0 and v0["dias_restantes"] >= 0


# ---------- Profile ----------
def test_profile_get(auth):
    r = requests.get(f"{API}/profile", headers=auth, timeout=15)
    assert r.status_code == 200
    assert r.json().get("onboarded") is True


# ---------- Generic CRUD smoke ----------
@pytest.mark.parametrize("path", [
    "tasks", "revisoes", "schedule", "questoes", "redacoes", "simulados",
    "vestibulares", "calendario", "notas", "decks", "conjuntos", "flashcards",
])
def test_list_endpoints(auth, path):
    r = requests.get(f"{API}/{path}", headers=auth, timeout=15)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
    assert isinstance(r.json(), list)


# ---------- Computed CRUD ----------
def test_questoes_compute(auth):
    r = requests.post(f"{API}/questoes", headers=auth, json={
        "materia": "Bio", "quantidade": 40, "acertos": 30, "data": TODAY, "observacoes": ""
    }, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["erros"] == 10 and d["percentual"] == 75.0
    requests.delete(f"{API}/questoes/{d['id']}", headers=auth, timeout=15)


def test_redacao_enem_sum(auth):
    r = requests.post(f"{API}/redacoes", headers=auth, json={
        "tema": "TEST_enem", "data": TODAY, "tipo": "enem",
        "c1": 160, "c2": 140, "c3": 140, "c4": 160, "c5": 120, "observacoes": ""
    }, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["nota_total"] == 720 and d["tipo"] == "enem"
    requests.delete(f"{API}/redacoes/{d['id']}", headers=auth, timeout=15)


def test_redacao_outro_nota_livre(auth):
    r = requests.post(f"{API}/redacoes", headers=auth, json={
        "tema": "TEST_outro", "data": TODAY, "tipo": "outro",
        "nota_livre": 750, "observacoes": ""
    }, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["nota_total"] == 750 and d["tipo"] == "outro"
    requests.delete(f"{API}/redacoes/{d['id']}", headers=auth, timeout=15)


def test_simulado_compute(auth):
    r = requests.post(f"{API}/simulados", headers=auth, json={
        "nome": "TEST_sim", "data": TODAY, "total_questoes": 180, "acertos": 120, "observacoes": ""
    }, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["erros"] == 60 and d["percentual"] == 66.67
    requests.delete(f"{API}/simulados/{d['id']}", headers=auth, timeout=15)


# ---------- Vestibular with data_prova ----------
def test_vestibular_data_prova_in_dashboard(auth):
    future = (dt.date.today() + dt.timedelta(days=42)).isoformat()
    r = requests.post(f"{API}/vestibulares", headers=auth, json={
        "nome": "TEST_VEST_FUTURE", "data_prova": future, "conteudos": "", "datas": "", "estrategias": "", "observacoes": ""
    }, timeout=15)
    assert r.status_code == 200
    vid = r.json()["id"]
    try:
        d = requests.get(f"{API}/dashboard", headers=auth, timeout=15).json()
        match = [v for v in d["vestibulares_proximos"] if v["id"] == vid]
        assert match, "Vestibular not in vests_proximos"
        assert match[0]["dias_restantes"] == 42
    finally:
        requests.delete(f"{API}/vestibulares/{vid}", headers=auth, timeout=15)


# ---------- Calendario CRUD ----------
def test_calendario_crud(auth):
    payload = {"titulo": "TEST_evento", "data": TODAY, "hora": "10:00", "observacoes": "x"}
    r = requests.post(f"{API}/calendario", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    eid = r.json()["id"]
    payload["titulo"] = "TEST_evento_upd"
    r2 = requests.put(f"{API}/calendario/{eid}", headers=auth, json=payload, timeout=15)
    assert r2.status_code == 200 and r2.json()["titulo"] == "TEST_evento_upd"
    r3 = requests.delete(f"{API}/calendario/{eid}", headers=auth, timeout=15)
    assert r3.status_code == 200


# ---------- Notas CRUD ----------
def test_notas_crud(auth):
    payload = {"titulo": "TEST_note", "conteudo": "## hi"}
    r = requests.post(f"{API}/notas", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    nid = r.json()["id"]
    payload["conteudo"] = "## bye"
    r2 = requests.put(f"{API}/notas/{nid}", headers=auth, json=payload, timeout=15)
    assert r2.status_code == 200 and r2.json()["conteudo"] == "## bye"
    requests.delete(f"{API}/notas/{nid}", headers=auth, timeout=15)


# ---------- Conjuntos with template ----------
def test_conjuntos_auto_template(auth):
    payload = {"nome": "TEST_conj", "data_inicio": TODAY,
               "data_fim": (dt.date.today() + dt.timedelta(days=14)).isoformat(),
               "semanas": [], "observacoes": ""}
    r = requests.post(f"{API}/conjuntos", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    d = r.json()
    cid = d["id"]
    assert len(d["semanas"]) == 2
    s1 = d["semanas"][0]
    s1_m1 = [c["label"] for c in s1["materia1"]]
    s1_m2 = [c["label"] for c in s1["materia2"]]
    assert s1_m1 == ["Matemática A", "Física C", "Química B", "Biologia C", "Matemática B", "SIMULADO", "COMPLETAR"]
    assert s1_m2 == ["História A", "Linguagens", "Geografia A/B", "Filosofia", "Química A", "SIMULADO", "COMPLETAR"]
    assert len(s1["modulos"]) == 7 and len(s1["exercicios"]) == 7

    # Toggle a cell concluido and update
    d["semanas"][0]["materia1"][0]["concluido"] = True
    upd_payload = {k: d[k] for k in ["nome", "data_inicio", "data_fim", "semanas", "observacoes"]}
    r2 = requests.put(f"{API}/conjuntos/{cid}", headers=auth, json=upd_payload, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["semanas"][0]["materia1"][0]["concluido"] is True

    # Cleanup
    r3 = requests.delete(f"{API}/conjuntos/{cid}", headers=auth, timeout=15)
    assert r3.status_code == 200


# ---------- Decks + Flashcards ----------
@pytest.fixture
def deck_id(auth):
    r = requests.post(f"{API}/decks", headers=auth, json={
        "nome": "TEST_deck", "materia": "Bio", "frente": "Frente A", "descricao": "", "tags": []
    }, timeout=15)
    assert r.status_code == 200
    did = r.json()["id"]
    yield did
    requests.delete(f"{API}/decks/{did}", headers=auth, timeout=15)


def test_decks_stats(auth, deck_id):
    r = requests.get(f"{API}/decks-stats", headers=auth, timeout=15)
    assert r.status_code == 200
    items = r.json()
    found = [d for d in items if d["id"] == deck_id]
    assert found, "deck not in stats"
    for k in ("total", "novos", "vencidos"):
        assert k in found[0]


def test_flashcard_crud_and_due(auth, deck_id):
    # Create
    payload = {
        "pergunta": "TEST_q", "resposta": "TEST_a", "deck_id": deck_id,
        "materia": "Bio", "frente": "Frente A", "tags": ["t1"],
    }
    r = requests.post(f"{API}/flashcards", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    card = r.json()
    cid = card["id"]
    assert card["status"] == "novo"
    assert card["proxima_revisao"] == TODAY

    # Due includes new card
    due = requests.get(f"{API}/flashcards/due", headers=auth, timeout=15).json()
    assert any(c["id"] == cid for c in due)

    # Delete
    requests.delete(f"{API}/flashcards/{cid}", headers=auth, timeout=15)


def test_flashcard_review_errei(auth, deck_id):
    r = requests.post(f"{API}/flashcards", headers=auth, json={
        "pergunta": "TEST_review_e", "resposta": "x", "deck_id": deck_id
    }, timeout=15)
    cid = r.json()["id"]
    rv = requests.post(f"{API}/flashcards/{cid}/review", headers=auth, json={"action": "errei"}, timeout=15)
    assert rv.status_code == 200
    c = rv.json()["card"]
    assert c["intervalo"] == 0
    assert c["status"] == "aprendendo"
    assert c["erros"] == 1
    assert c["proxima_revisao"] == TODAY
    requests.delete(f"{API}/flashcards/{cid}", headers=auth, timeout=15)


def test_flashcard_review_bom_new(auth, deck_id):
    r = requests.post(f"{API}/flashcards", headers=auth, json={
        "pergunta": "TEST_review_b", "resposta": "x", "deck_id": deck_id
    }, timeout=15)
    cid = r.json()["id"]
    rv = requests.post(f"{API}/flashcards/{cid}/review", headers=auth, json={"action": "bom"}, timeout=15)
    assert rv.status_code == 200
    c = rv.json()["card"]
    assert c["intervalo"] == 3
    assert c["status"] == "revisao"
    assert c["acertos"] == 1
    expected = (dt.date.today() + dt.timedelta(days=3)).isoformat()
    assert c["proxima_revisao"] == expected
    requests.delete(f"{API}/flashcards/{cid}", headers=auth, timeout=15)


def test_flashcard_review_facil_new(auth, deck_id):
    r = requests.post(f"{API}/flashcards", headers=auth, json={
        "pergunta": "TEST_review_f", "resposta": "x", "deck_id": deck_id
    }, timeout=15)
    cid = r.json()["id"]
    rv = requests.post(f"{API}/flashcards/{cid}/review", headers=auth, json={"action": "facil"}, timeout=15)
    c = rv.json()["card"]
    assert c["intervalo"] == 5
    requests.delete(f"{API}/flashcards/{cid}", headers=auth, timeout=15)


def test_flashcard_suspend_toggle(auth, deck_id):
    r = requests.post(f"{API}/flashcards", headers=auth, json={
        "pergunta": "TEST_susp", "resposta": "x", "deck_id": deck_id
    }, timeout=15)
    cid = r.json()["id"]
    s1 = requests.post(f"{API}/flashcards/{cid}/suspend", headers=auth, timeout=15).json()
    assert s1["suspenso"] is True
    s2 = requests.post(f"{API}/flashcards/{cid}/suspend", headers=auth, timeout=15).json()
    assert s2["suspenso"] is False
    requests.delete(f"{API}/flashcards/{cid}", headers=auth, timeout=15)


def test_flashcard_import(auth, deck_id):
    payload = {
        "deck_id": deck_id,
        "default_materia": "Bio",
        "cards": [
            {"pergunta": "TEST_imp_q1", "resposta": "a1", "tags": "tag1;tag2"},
            {"pergunta": "TEST_imp_q2", "resposta": "a2"},
            {"pergunta": "", "resposta": "skip"},
        ],
    }
    r = requests.post(f"{API}/flashcards/import", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    assert r.json()["created"] == 2
    # Verify they exist
    cards = requests.get(f"{API}/flashcards", headers=auth, params={"deck_id": deck_id}, timeout=15).json()
    perg = [c["pergunta"] for c in cards]
    assert "TEST_imp_q1" in perg and "TEST_imp_q2" in perg
    # Cleanup imported cards
    for c in cards:
        if c["pergunta"].startswith("TEST_imp_"):
            requests.delete(f"{API}/flashcards/{c['id']}", headers=auth, timeout=15)


def test_flashcards_stats(auth):
    r = requests.get(f"{API}/flashcards/stats", headers=auth, timeout=15)
    assert r.status_code == 200
    s = r.json()
    for k in ("total", "novos", "revisao", "due_hoje", "taxa_acerto"):
        assert k in s
