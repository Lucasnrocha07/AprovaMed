import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://estuda-med-hoje.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
DEMO_EMAIL = "demo@aprovamed.com"
DEMO_PASSWORD = "demo123"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Health
def test_health():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# Auth
def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"}, timeout=15)
    assert r.status_code == 401


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


def test_dashboard(auth):
    r = requests.get(f"{API}/dashboard", headers=auth, timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ["tasks_today", "revisoes_pendentes", "questoes_semana", "ultima_redacao", "ultimo_simulado", "dias_restantes"]:
        assert k in d
    assert d["ultima_redacao"] is not None
    assert d["ultimo_simulado"] is not None
    assert isinstance(d["tasks_today"], list)


def test_profile(auth):
    r = requests.get(f"{API}/profile", headers=auth, timeout=15)
    assert r.status_code == 200
    p = r.json()
    assert p.get("onboarded") is True
    # update
    p_update = {k: p[k] for k in ["vestibular_alvo","prova_data","horas_dia","materias_fortes","materias_fracas","conteudos_atrasados","meta_questoes_semana","meta_redacoes_mes","onboarded","theme"]}
    p_update["horas_dia"] = 5
    r2 = requests.put(f"{API}/profile", headers=auth, json=p_update, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["horas_dia"] == 5


@pytest.mark.parametrize("path", ["tasks", "revisoes", "schedule", "questoes", "redacoes", "simulados", "vestibulares"])
def test_list_endpoints(auth, path):
    r = requests.get(f"{API}/{path}", headers=auth, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_tasks_crud(auth):
    payload = {"titulo":"TEST_task","materia":"Bio","tipo":"teoria","tempo_min":30,"status":"pendente","data":"2026-01-15","observacoes":""}
    r = requests.post(f"{API}/tasks", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    tid = r.json()["id"]
    payload["status"] = "concluido"
    r2 = requests.put(f"{API}/tasks/{tid}", headers=auth, json=payload, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["status"] == "concluido"
    r3 = requests.delete(f"{API}/tasks/{tid}", headers=auth, timeout=15)
    assert r3.status_code == 200


def test_revisoes_crud(auth):
    payload = {"materia":"Mat","frente":"A","semana":1,"data_inicio":"2026-01-10","data_fim":"2026-01-24","status":"pendente","observacoes":""}
    r = requests.post(f"{API}/revisoes", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    rid = r.json()["id"]
    requests.delete(f"{API}/revisoes/{rid}", headers=auth, timeout=15)


def test_schedule_crud(auth):
    payload = {"data":"2026-01-15","hora_inicio":"08:00","hora_fim":"09:00","materia":"Fis","tipo":"teoria","observacoes":"","concluido":False}
    r = requests.post(f"{API}/schedule", headers=auth, json=payload, timeout=15)
    assert r.status_code == 200
    requests.delete(f"{API}/schedule/{r.json()['id']}", headers=auth, timeout=15)


def test_questoes2_compute(auth):
    r = requests.post(f"{API}/questoes2", headers=auth, json={"materia":"Bio","quantidade":40,"acertos":30,"data":"2026-01-15","observacoes":""}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["erros"] == 10
    assert d["percentual"] == 75.0
    requests.delete(f"{API}/questoes/{d['id']}", headers=auth, timeout=15)


def test_redacoes2_compute(auth):
    r = requests.post(f"{API}/redacoes2", headers=auth, json={"tema":"TEST","data":"2026-01-15","c1":160,"c2":140,"c3":140,"c4":160,"c5":120,"observacoes":""}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["nota_total"] == 720
    requests.delete(f"{API}/redacoes/{d['id']}", headers=auth, timeout=15)


def test_simulados2_compute(auth):
    r = requests.post(f"{API}/simulados2", headers=auth, json={"nome":"TEST","data":"2026-01-15","total_questoes":180,"acertos":120,"observacoes":""}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["erros"] == 60
    assert d["percentual"] == 66.67
    requests.delete(f"{API}/simulados/{d['id']}", headers=auth, timeout=15)


def test_vestibulares_crud(auth):
    r = requests.post(f"{API}/vestibulares", headers=auth, json={"nome":"TEST_V","conteudos":"x","datas":"y","estrategias":"z","observacoes":""}, timeout=15)
    assert r.status_code == 200
    requests.delete(f"{API}/vestibulares/{r.json()['id']}", headers=auth, timeout=15)
