from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_TTL_DAYS = 30

DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "demo@aprovamed.com")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "demo123")

app = FastAPI(title="AprovaMed Planner API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aprovamed")


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return date.today().isoformat()


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    vestibular_alvo: str = ""
    prova_data: Optional[str] = None  # YYYY-MM-DD
    horas_dia: float = 4
    materias_fortes: List[str] = []
    materias_fracas: List[str] = []
    conteudos_atrasados: List[str] = []
    meta_questoes_semana: int = 200
    meta_redacoes_mes: int = 4
    onboarded: bool = False
    theme: str = "light"


class TaskIn(BaseModel):
    titulo: str
    materia: str
    frente: Optional[str] = None
    tipo: Literal["teoria", "revisao", "questoes", "redacao"] = "teoria"
    tempo_min: int = 30
    status: Literal["pendente", "em_andamento", "concluido"] = "pendente"
    data: str  # YYYY-MM-DD
    observacoes: str = ""


class RevisaoIn(BaseModel):
    materia: str
    frente: str
    semana: int = 1  # 1 ou 2
    data_inicio: str
    data_fim: str
    status: Literal["pendente", "em_andamento", "concluido"] = "pendente"
    observacoes: str = ""


class ScheduleIn(BaseModel):
    data: str  # YYYY-MM-DD
    hora_inicio: str  # HH:MM
    hora_fim: str  # HH:MM
    materia: str
    frente: Optional[str] = None
    tipo: Literal["teoria", "revisao", "questoes", "redacao", "outro"] = "teoria"
    observacoes: str = ""
    concluido: bool = False


class QuestionIn(BaseModel):
    materia: str
    frente: Optional[str] = None
    quantidade: int
    acertos: int
    data: str
    observacoes: str = ""


class RedacaoIn(BaseModel):
    tema: str
    data: str
    tipo: Literal["enem", "outro"] = "enem"
    c1: int = 0
    c2: int = 0
    c3: int = 0
    c4: int = 0
    c5: int = 0
    nota_livre: Optional[float] = None
    observacoes: str = ""


class SimuladoIn(BaseModel):
    nome: str
    data: str
    total_questoes: int
    acertos: int
    nota: Optional[float] = None
    observacoes: str = ""


class VestibularIn(BaseModel):
    nome: str
    conteudos: str = ""
    datas: str = ""
    data_prova: Optional[str] = None  # YYYY-MM-DD
    estrategias: str = ""
    observacoes: str = ""


class CalendarioIn(BaseModel):
    titulo: str
    data: str
    hora: Optional[str] = None
    observacoes: str = ""


class NotaIn(BaseModel):
    titulo: str
    conteudo: str = ""


class ConjuntoIn(BaseModel):
    nome: str
    data_inicio: str
    data_fim: str
    semanas: List[dict] = []  # [{num:1, materia1:[{label,concluido,obs}*7], materia2, modulos, exercicios}]
    observacoes: str = ""


class DeckIn(BaseModel):
    nome: str
    materia: Optional[str] = None
    frente: Optional[str] = None
    descricao: str = ""
    tags: List[str] = []


class FlashcardIn(BaseModel):
    pergunta: str
    resposta: str
    materia: Optional[str] = None
    frente: Optional[str] = None
    deck_id: str
    tags: List[str] = []
    dificuldade: int = 0
    status: Literal["novo", "aprendendo", "revisao", "suspenso", "concluido"] = "novo"
    intervalo: int = 0
    ease: float = 2.5
    proxima_revisao: Optional[str] = None
    revisoes: int = 0
    acertos: int = 0
    erros: int = 0
    historico: List[dict] = []
    suspenso: bool = False


class ReviewIn(BaseModel):
    action: Literal["errei", "dificil", "bom", "facil"]


class ImportIn(BaseModel):
    deck_id: str
    default_materia: Optional[str] = None
    default_frente: Optional[str] = None
    cards: List[dict]


# ----------------------------------------------------------------------------
# Auth Endpoints
# ----------------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    # Default profile
    await db.profiles.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **ProfileIn().model_dump(),
        "created_at": now_iso(),
    })
    token = make_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": body.name}}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    token = make_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ----------------------------------------------------------------------------
# Profile
# ----------------------------------------------------------------------------
@api.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    p = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not p:
        p = {"id": str(uuid.uuid4()), "user_id": user["id"], **ProfileIn().model_dump(), "created_at": now_iso()}
        await db.profiles.insert_one(p.copy())
        p.pop("_id", None)
    return p


@api.put("/profile")
async def update_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    data = body.model_dump()
    await db.profiles.update_one({"user_id": user["id"]}, {"$set": data}, upsert=True)
    p = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return p


# ----------------------------------------------------------------------------
# Generic CRUD factory
# ----------------------------------------------------------------------------
def make_crud(prefix: str, collection: str, model_in):
    @api.get(f"/{prefix}")
    async def list_items(user: dict = Depends(get_current_user), data: Optional[str] = None):
        q = {"user_id": user["id"]}
        if data:
            q["data"] = data
        items = await db[collection].find(q, {"_id": 0}).sort("data", -1).to_list(2000)
        return items

    @api.post(f"/{prefix}")
    async def create_item(body: model_in, user: dict = Depends(get_current_user)):
        doc = body.model_dump()
        doc["id"] = str(uuid.uuid4())
        doc["user_id"] = user["id"]
        doc["created_at"] = now_iso()
        await db[collection].insert_one(doc.copy())
        doc.pop("_id", None)
        return doc

    @api.put(f"/{prefix}/{{item_id}}")
    async def update_item(item_id: str, body: model_in, user: dict = Depends(get_current_user)):
        existing = await db[collection].find_one({"id": item_id, "user_id": user["id"]})
        if not existing:
            raise HTTPException(status_code=404, detail="Não encontrado")
        await db[collection].update_one(
            {"id": item_id, "user_id": user["id"]},
            {"$set": body.model_dump()},
        )
        item = await db[collection].find_one({"id": item_id}, {"_id": 0})
        return item

    @api.delete(f"/{prefix}/{{item_id}}")
    async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
        res = await db[collection].delete_one({"id": item_id, "user_id": user["id"]})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Não encontrado")
        return {"ok": True}

    return list_items, create_item, update_item, delete_item


make_crud("tasks", "tasks", TaskIn)
make_crud("revisoes", "revisoes", RevisaoIn)
make_crud("schedule", "schedule", ScheduleIn)
make_crud("vestibulares", "vestibulares", VestibularIn)
make_crud("calendario", "calendario", CalendarioIn)
make_crud("notas", "notas", NotaIn)
make_crud("decks", "flashcard_decks", DeckIn)


# ---- Flashcards ----
def _sm_update(card: dict, action: str) -> dict:
    """SM-2-lite spaced repetition."""
    ease = float(card.get("ease", 2.5))
    intervalo = int(card.get("intervalo", 0))
    status = card.get("status", "novo")
    is_new = status in ("novo", "aprendendo") or intervalo == 0

    if action == "errei":
        intervalo = 0  # same day
        ease = max(1.3, ease - 0.2)
        status = "aprendendo"
        card["erros"] = int(card.get("erros", 0)) + 1
    elif action == "dificil":
        if is_new:
            intervalo = 1
            status = "aprendendo"
        else:
            intervalo = max(1, round(intervalo * 1.2))
            status = "revisao"
        ease = max(1.3, ease - 0.15)
        card["acertos"] = int(card.get("acertos", 0)) + 1
    elif action == "bom":
        if is_new:
            intervalo = 3
        else:
            intervalo = max(1, round(intervalo * ease))
        status = "revisao"
        card["acertos"] = int(card.get("acertos", 0)) + 1
    elif action == "facil":
        if is_new:
            intervalo = 5
        else:
            intervalo = max(1, round(intervalo * ease * 1.3))
        ease = ease + 0.15
        status = "revisao"
        card["acertos"] = int(card.get("acertos", 0)) + 1

    card["ease"] = round(ease, 2)
    card["intervalo"] = intervalo
    card["status"] = status
    card["revisoes"] = int(card.get("revisoes", 0)) + 1
    card["proxima_revisao"] = (date.today() + timedelta(days=intervalo)).isoformat()
    hist = card.get("historico") or []
    hist.append({"data": now_iso(), "action": action, "intervalo": intervalo, "ease": card["ease"]})
    card["historico"] = hist[-50:]
    return card


@api.get("/flashcards")
async def list_flashcards(
    user: dict = Depends(get_current_user),
    deck_id: Optional[str] = None,
    materia: Optional[str] = None,
    status: Optional[str] = None,
):
    q = {"user_id": user["id"]}
    if deck_id:
        q["deck_id"] = deck_id
    if materia:
        q["materia"] = materia
    if status:
        q["status"] = status
    items = await db.flashcards.find(q, {"_id": 0}).to_list(5000)
    return items


@api.get("/flashcards/due")
async def due_flashcards(user: dict = Depends(get_current_user), deck_id: Optional[str] = None):
    today = today_str()
    q = {
        "user_id": user["id"],
        "suspenso": {"$ne": True},
        "$or": [
            {"status": "novo"},
            {"proxima_revisao": {"$lte": today}},
            {"proxima_revisao": None},
        ],
    }
    if deck_id:
        q["deck_id"] = deck_id
    items = await db.flashcards.find(q, {"_id": 0}).to_list(5000)
    return items


@api.get("/flashcards/stats")
async def flashcards_stats(user: dict = Depends(get_current_user)):
    today = today_str()
    all_cards = await db.flashcards.find({"user_id": user["id"]}, {"_id": 0}).to_list(10000)
    total = len(all_cards)
    novos = sum(1 for c in all_cards if c.get("status") == "novo")
    aprend = sum(1 for c in all_cards if c.get("status") == "aprendendo")
    rev = sum(1 for c in all_cards if c.get("status") == "revisao")
    susp = sum(1 for c in all_cards if c.get("suspenso"))
    vencidos = sum(1 for c in all_cards if c.get("proxima_revisao") and c["proxima_revisao"] < today and not c.get("suspenso"))
    due_hoje = sum(1 for c in all_cards if (c.get("status") == "novo" or (c.get("proxima_revisao") and c["proxima_revisao"] <= today)) and not c.get("suspenso"))
    acertos = sum(int(c.get("acertos", 0)) for c in all_cards)
    erros = sum(int(c.get("erros", 0)) for c in all_cards)
    taxa = round((acertos / (acertos + erros)) * 100, 1) if (acertos + erros) else 0
    # reviews today
    reviews_today = await db.flashcard_reviews.count_documents({
        "user_id": user["id"], "data_iso": {"$gte": today + "T00:00:00"}
    })
    return {
        "total": total, "novos": novos, "aprendendo": aprend, "revisao": rev,
        "suspensos": susp, "vencidos": vencidos, "due_hoje": due_hoje,
        "acertos": acertos, "erros": erros, "taxa_acerto": taxa,
        "reviews_hoje": reviews_today,
    }


@api.post("/flashcards")
async def create_flashcard(body: FlashcardIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = now_iso()
    if not doc.get("proxima_revisao"):
        doc["proxima_revisao"] = today_str()
    await db.flashcards.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.put("/flashcards/{card_id}")
async def update_flashcard(card_id: str, body: FlashcardIn, user: dict = Depends(get_current_user)):
    existing = await db.flashcards.find_one({"id": card_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await db.flashcards.update_one({"id": card_id, "user_id": user["id"]}, {"$set": body.model_dump()})
    return await db.flashcards.find_one({"id": card_id}, {"_id": 0})


@api.delete("/flashcards/{card_id}")
async def delete_flashcard(card_id: str, user: dict = Depends(get_current_user)):
    res = await db.flashcards.delete_one({"id": card_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return {"ok": True}


@api.post("/flashcards/{card_id}/suspend")
async def suspend_flashcard(card_id: str, user: dict = Depends(get_current_user)):
    existing = await db.flashcards.find_one({"id": card_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Não encontrado")
    new_val = not bool(existing.get("suspenso"))
    await db.flashcards.update_one(
        {"id": card_id, "user_id": user["id"]},
        {"$set": {"suspenso": new_val, "status": "suspenso" if new_val else "novo"}}
    )
    return await db.flashcards.find_one({"id": card_id}, {"_id": 0})


@api.post("/flashcards/{card_id}/review")
async def review_flashcard(card_id: str, body: ReviewIn, user: dict = Depends(get_current_user)):
    card = await db.flashcards.find_one({"id": card_id, "user_id": user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="Não encontrado")
    card.pop("_id", None)
    prev_int = int(card.get("intervalo", 0))
    updated = _sm_update(card, body.action)
    await db.flashcards.update_one(
        {"id": card_id, "user_id": user["id"]},
        {"$set": {
            "ease": updated["ease"], "intervalo": updated["intervalo"],
            "status": updated["status"], "revisoes": updated["revisoes"],
            "acertos": updated["acertos"], "erros": updated["erros"],
            "proxima_revisao": updated["proxima_revisao"], "historico": updated["historico"],
        }},
    )
    # Save review log
    await db.flashcard_reviews.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "card_id": card_id,
        "action": body.action, "intervalo_anterior": prev_int,
        "novo_intervalo": updated["intervalo"],
        "proxima_revisao": updated["proxima_revisao"],
        "data_iso": now_iso(),
    })
    return {"ok": True, "card": updated}


@api.post("/flashcards/import")
async def import_flashcards(body: ImportIn, user: dict = Depends(get_current_user)):
    deck = await db.flashcard_decks.find_one({"id": body.deck_id, "user_id": user["id"]})
    if not deck:
        raise HTTPException(status_code=404, detail="Baralho não encontrado")
    created = 0
    today = today_str()
    for row in body.cards:
        perg = (row.get("pergunta") or row.get("question") or "").strip()
        resp = (row.get("resposta") or row.get("answer") or "").strip()
        if not perg or not resp:
            continue
        tags_raw = row.get("tags") or ""
        if isinstance(tags_raw, str):
            tags = [t.strip() for t in tags_raw.replace(",", ";").split(";") if t.strip()]
        else:
            tags = list(tags_raw)
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "pergunta": perg, "resposta": resp,
            "materia": row.get("materia") or body.default_materia,
            "frente": row.get("frente") or body.default_frente,
            "deck_id": body.deck_id,
            "tags": tags,
            "dificuldade": 0, "status": "novo",
            "intervalo": 0, "ease": 2.5,
            "proxima_revisao": today,
            "revisoes": 0, "acertos": 0, "erros": 0,
            "historico": [], "suspenso": False,
            "created_at": now_iso(),
        }
        await db.flashcards.insert_one(doc)
        created += 1
    return {"created": created}


@api.get("/decks-stats")
async def decks_with_stats(user: dict = Depends(get_current_user)):
    """Returns decks enriched with card counts / progress."""
    decks = await db.flashcard_decks.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    if not decks:
        return []
    cards = await db.flashcards.find({"user_id": user["id"]}, {"_id": 0}).to_list(10000)
    by_deck = {}
    today = today_str()
    for c in cards:
        did = c.get("deck_id")
        d = by_deck.setdefault(did, {"total": 0, "novos": 0, "vencidos": 0, "ultima_revisao": None})
        d["total"] += 1
        if c.get("status") == "novo":
            d["novos"] += 1
        if c.get("proxima_revisao") and c["proxima_revisao"] <= today and not c.get("suspenso"):
            d["vencidos"] += 1
        hist = c.get("historico") or []
        if hist:
            last = hist[-1].get("data")
            if last and (d["ultima_revisao"] is None or last > d["ultima_revisao"]):
                d["ultima_revisao"] = last
    for d in decks:
        s = by_deck.get(d["id"], {"total": 0, "novos": 0, "vencidos": 0, "ultima_revisao": None})
        d.update(s)
    return decks


# ---- Conjuntos de revisão ----
CONJUNTO_TEMPLATE = {
    1: {
        "materia1": ["Matemática A", "Física C", "Química B", "Biologia C", "Matemática B", "SIMULADO", "COMPLETAR"],
        "materia2": ["História A", "Linguagens", "Geografia A/B", "Filosofia", "Química A", "SIMULADO", "COMPLETAR"],
    },
    2: {
        "materia1": ["Física A", "Química C", "Biologia A", "Matemática C", "Física B", "SIMULADO", "COMPLETAR"],
        "materia2": ["Sociologia", "Linguagens", "Geografia C/D", "História B/C", "Biologia B", "SIMULADO", "COMPLETAR"],
    },
}


def _build_semanas():
    out = []
    for n in (1, 2):
        t = CONJUNTO_TEMPLATE[n]
        out.append({
            "num": n,
            "materia1": [{"label": x, "concluido": False, "observacoes": ""} for x in t["materia1"]],
            "materia2": [{"label": x, "concluido": False, "observacoes": ""} for x in t["materia2"]],
            "modulos": [{"label": "", "concluido": False, "observacoes": ""} for _ in range(7)],
            "exercicios": [{"label": "", "concluido": False, "observacoes": ""} for _ in range(7)],
        })
    return out


@api.get("/conjuntos")
async def list_conjuntos(user: dict = Depends(get_current_user)):
    items = await db.conjuntos.find({"user_id": user["id"]}, {"_id": 0}).sort("data_inicio", -1).to_list(500)
    return items


@api.post("/conjuntos")
async def create_conjunto(body: ConjuntoIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    if not doc.get("semanas"):
        doc["semanas"] = _build_semanas()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["created_at"] = now_iso()
    await db.conjuntos.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.put("/conjuntos/{item_id}")
async def update_conjunto(item_id: str, body: ConjuntoIn, user: dict = Depends(get_current_user)):
    existing = await db.conjuntos.find_one({"id": item_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await db.conjuntos.update_one({"id": item_id, "user_id": user["id"]}, {"$set": body.model_dump()})
    return await db.conjuntos.find_one({"id": item_id}, {"_id": 0})


@api.delete("/conjuntos/{item_id}")
async def delete_conjunto(item_id: str, user: dict = Depends(get_current_user)):
    res = await db.conjuntos.delete_one({"id": item_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Não encontrado")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Custom CRUD for collections with computed fields
# ----------------------------------------------------------------------------
def _compute_questao(d: dict) -> dict:
    d["erros"] = max(d["quantidade"] - d["acertos"], 0)
    d["percentual"] = round((d["acertos"] / d["quantidade"]) * 100, 2) if d["quantidade"] else 0
    return d


def _compute_redacao(d: dict) -> dict:
    if d.get("tipo") == "outro":
        d["nota_total"] = float(d.get("nota_livre") or 0)
    else:
        d["nota_total"] = d["c1"] + d["c2"] + d["c3"] + d["c4"] + d["c5"]
    return d


def _compute_simulado(d: dict) -> dict:
    d["erros"] = max(d["total_questoes"] - d["acertos"], 0)
    d["percentual"] = round((d["acertos"] / d["total_questoes"]) * 100, 2) if d["total_questoes"] else 0
    return d


def make_computed_crud(prefix: str, collection: str, model_in, compute_fn):
    @api.get(f"/{prefix}")
    async def list_items(user: dict = Depends(get_current_user)):
        items = await db[collection].find({"user_id": user["id"]}, {"_id": 0}).sort("data", -1).to_list(2000)
        return items

    @api.post(f"/{prefix}")
    async def create_item(body: model_in, user: dict = Depends(get_current_user)):
        doc = body.model_dump()
        doc = compute_fn(doc)
        doc["id"] = str(uuid.uuid4())
        doc["user_id"] = user["id"]
        doc["created_at"] = now_iso()
        await db[collection].insert_one(doc.copy())
        doc.pop("_id", None)
        return doc

    @api.put(f"/{prefix}/{{item_id}}")
    async def update_item(item_id: str, body: model_in, user: dict = Depends(get_current_user)):
        existing = await db[collection].find_one({"id": item_id, "user_id": user["id"]})
        if not existing:
            raise HTTPException(status_code=404, detail="Não encontrado")
        update_doc = compute_fn(body.model_dump())
        await db[collection].update_one(
            {"id": item_id, "user_id": user["id"]},
            {"$set": update_doc},
        )
        item = await db[collection].find_one({"id": item_id}, {"_id": 0})
        return item

    @api.delete(f"/{prefix}/{{item_id}}")
    async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
        res = await db[collection].delete_one({"id": item_id, "user_id": user["id"]})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Não encontrado")
        return {"ok": True}


make_computed_crud("questoes", "questoes", QuestionIn, _compute_questao)
make_computed_crud("redacoes", "redacoes", RedacaoIn, _compute_redacao)
make_computed_crud("simulados", "simulados", SimuladoIn, _compute_simulado)


# ----------------------------------------------------------------------------
# Dashboard summary
# ----------------------------------------------------------------------------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    today = today_str()
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    tasks_today = await db.tasks.find({"user_id": user["id"], "data": today}, {"_id": 0}).to_list(500)
    revisoes_pend = await db.revisoes.find(
        {"user_id": user["id"], "status": {"$ne": "concluido"}}, {"_id": 0}
    ).to_list(500)

    # Questoes da semana
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
    questoes_semana = await db.questoes.find(
        {"user_id": user["id"], "data": {"$gte": week_start}}, {"_id": 0}
    ).to_list(500)
    total_questoes_semana = sum(q.get("quantidade", 0) for q in questoes_semana)
    total_acertos_semana = sum(q.get("acertos", 0) for q in questoes_semana)

    last_redacao = await db.redacoes.find({"user_id": user["id"]}, {"_id": 0}).sort("data", -1).to_list(1)
    last_simulado = await db.simulados.find({"user_id": user["id"]}, {"_id": 0}).sort("data", -1).to_list(1)

    # Vestibulares próximos (com data_prova)
    vests = await db.vestibulares.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    vests_proximos = []
    for v in vests:
        if v.get("data_prova"):
            try:
                dp = datetime.fromisoformat(v["data_prova"]).date()
                d_rest = (dp - date.today()).days
                if d_rest >= 0:
                    vests_proximos.append({**v, "dias_restantes": d_rest})
            except Exception:
                pass
    vests_proximos.sort(key=lambda x: x["dias_restantes"])

    # Eventos próximos (calendário)
    eventos = await db.calendario.find(
        {"user_id": user["id"], "data": {"$gte": today_str()}}, {"_id": 0}
    ).sort("data", 1).to_list(20)

    # Conjuntos: progresso
    conjuntos = await db.conjuntos.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    conjuntos_progress = []
    for c in conjuntos:
        total = done = 0
        for s in c.get("semanas", []):
            for k in ("materia1", "materia2", "modulos", "exercicios"):
                for cell in s.get(k, []):
                    if cell.get("label"):
                        total += 1
                        if cell.get("concluido"):
                            done += 1
        conjuntos_progress.append({
            "id": c["id"], "nome": c["nome"], "data_inicio": c["data_inicio"], "data_fim": c["data_fim"],
            "total": total, "done": done, "pct": round((done / total) * 100) if total else 0,
        })

    # Progresso até a prova
    dias_restantes = None
    if profile.get("prova_data"):
        try:
            d = datetime.fromisoformat(profile["prova_data"]).date()
            dias_restantes = (d - date.today()).days
        except Exception:
            dias_restantes = None

    # Flashcards due count
    today = today_str()
    fc_due = await db.flashcards.count_documents({
        "user_id": user["id"],
        "suspenso": {"$ne": True},
        "$or": [{"status": "novo"}, {"proxima_revisao": {"$lte": today}}],
    })
    fc_atrasados = await db.flashcards.count_documents({
        "user_id": user["id"],
        "suspenso": {"$ne": True},
        "proxima_revisao": {"$lt": today},
    })

    return {
        "tasks_today": tasks_today,
        "revisoes_pendentes": revisoes_pend,
        "questoes_semana": {
            "total": total_questoes_semana,
            "acertos": total_acertos_semana,
            "meta": profile.get("meta_questoes_semana", 200),
        },
        "ultima_redacao": last_redacao[0] if last_redacao else None,
        "ultimo_simulado": last_simulado[0] if last_simulado else None,
        "dias_restantes": dias_restantes,
        "prova_data": profile.get("prova_data"),
        "vestibular_alvo": profile.get("vestibular_alvo", ""),
        "vestibulares_proximos": vests_proximos[:5],
        "eventos_proximos": eventos[:5],
        "conjuntos_progress": conjuntos_progress,
        "flashcards_due": fc_due,
        "flashcards_atrasados": fc_atrasados,
    }


# ----------------------------------------------------------------------------
# Demo seeding
# ----------------------------------------------------------------------------
async def seed_demo():
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        # Reset password if changed
        if not verify_password(DEMO_PASSWORD, existing["password_hash"]):
            await db.users.update_one(
                {"email": DEMO_EMAIL}, {"$set": {"password_hash": hash_password(DEMO_PASSWORD)}}
            )
        return

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": DEMO_EMAIL,
        "name": "Estudante Demo",
        "password_hash": hash_password(DEMO_PASSWORD),
        "created_at": now_iso(),
    })

    # Profile
    prova = (date.today() + timedelta(days=160)).isoformat()
    await db.profiles.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "vestibular_alvo": "ENEM + UFU + UFMG",
        "prova_data": prova,
        "horas_dia": 6,
        "materias_fortes": ["Biologia", "Português"],
        "materias_fracas": ["Matemática", "Física"],
        "conteudos_atrasados": ["Termodinâmica", "Geometria Analítica"],
        "meta_questoes_semana": 250,
        "meta_redacoes_mes": 4,
        "onboarded": True,
        "theme": "light",
        "created_at": now_iso(),
    })

    today = date.today()
    # Tasks
    tasks = [
        {"titulo": "Revisar Leis de Newton", "materia": "Física", "frente": "Frente A", "tipo": "revisao", "tempo_min": 45, "status": "pendente"},
        {"titulo": "Resolver 30 questões de Citologia", "materia": "Biologia", "frente": "Frente A", "tipo": "questoes", "tempo_min": 60, "status": "em_andamento"},
        {"titulo": "Teoria - Função Quadrática", "materia": "Matemática", "frente": "Frente B", "tipo": "teoria", "tempo_min": 50, "status": "pendente"},
        {"titulo": "Redação tema livre - Tecnologia", "materia": "Redação", "frente": None, "tipo": "redacao", "tempo_min": 90, "status": "concluido"},
        {"titulo": "Geografia - Climas do Brasil", "materia": "Geografia", "frente": "Frente A", "tipo": "teoria", "tempo_min": 40, "status": "pendente"},
    ]
    for t in tasks:
        await db.tasks.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "data": today.isoformat(), "observacoes": "", **t,
            "created_at": now_iso(),
        })

    # Revisões
    revisoes = [
        {"materia": "Matemática", "frente": "Frente A", "semana": 1, "offset": 0, "status": "em_andamento"},
        {"materia": "Biologia", "frente": "Frente B", "semana": 2, "offset": -7, "status": "em_andamento"},
        {"materia": "História", "frente": "Frente A", "semana": 1, "offset": 2, "status": "pendente"},
        {"materia": "Química", "frente": "Frente C", "semana": 1, "offset": -14, "status": "concluido"},
    ]
    for r in revisoes:
        ini = (today + timedelta(days=r["offset"])).isoformat()
        fim = (today + timedelta(days=r["offset"] + 14)).isoformat()
        await db.revisoes.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "materia": r["materia"], "frente": r["frente"],
            "semana": r["semana"], "data_inicio": ini, "data_fim": fim, "status": r["status"],
            "observacoes": "", "created_at": now_iso(),
        })

    # Schedule
    schedule = [
        {"hora_inicio": "07:00", "hora_fim": "08:30", "materia": "Matemática", "frente": "Frente A", "tipo": "teoria", "concluido": False},
        {"hora_inicio": "09:00", "hora_fim": "10:30", "materia": "Biologia", "frente": "Frente A", "tipo": "questoes", "concluido": True},
        {"hora_inicio": "14:00", "hora_fim": "15:30", "materia": "Redação", "frente": None, "tipo": "redacao", "concluido": False},
        {"hora_inicio": "16:00", "hora_fim": "17:00", "materia": "Física", "frente": "Frente B", "tipo": "revisao", "concluido": False},
    ]
    for s in schedule:
        await db.schedule.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "data": today.isoformat(),
            **s, "observacoes": "", "created_at": now_iso(),
        })

    # Questoes
    for i in range(8):
        d = (today - timedelta(days=i)).isoformat()
        qtd = 30 + (i * 3) % 20
        ace = qtd - (5 + i % 7)
        await db.questoes.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id,
            "materia": ["Biologia", "Matemática", "Física", "Química"][i % 4],
            "frente": "Frente A", "quantidade": qtd, "acertos": ace,
            "erros": qtd - ace, "percentual": round((ace / qtd) * 100, 2),
            "data": d, "observacoes": "", "created_at": now_iso(),
        })

    # Redacoes
    redacoes = [
        {"tema": "Desafios da educação digital no Brasil", "offset": -28, "c1": 160, "c2": 140, "c3": 140, "c4": 160, "c5": 120},
        {"tema": "Saúde mental dos jovens", "offset": -14, "c1": 180, "c2": 160, "c3": 160, "c4": 180, "c5": 140},
        {"tema": "Sustentabilidade urbana", "offset": -3, "c1": 180, "c2": 180, "c3": 160, "c4": 180, "c5": 160},
    ]
    for r in redacoes:
        d = (today + timedelta(days=r["offset"])).isoformat()
        await db.redacoes.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "tema": r["tema"], "data": d,
            "c1": r["c1"], "c2": r["c2"], "c3": r["c3"], "c4": r["c4"], "c5": r["c5"],
            "nota_total": r["c1"] + r["c2"] + r["c3"] + r["c4"] + r["c5"],
            "observacoes": "", "created_at": now_iso(),
        })

    # Simulados
    simulados = [
        {"nome": "ENEM Treino 1", "offset": -45, "total": 180, "acertos": 110, "nota": 620.5},
        {"nome": "UFU Simulado", "offset": -20, "total": 120, "acertos": 78, "nota": None},
        {"nome": "ENEM Treino 2", "offset": -7, "total": 180, "acertos": 125, "nota": 680.0},
    ]
    for s in simulados:
        d = (today + timedelta(days=s["offset"])).isoformat()
        await db.simulados.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, "nome": s["nome"], "data": d,
            "total_questoes": s["total"], "acertos": s["acertos"],
            "erros": s["total"] - s["acertos"],
            "percentual": round((s["acertos"] / s["total"]) * 100, 2),
            "nota": s["nota"], "observacoes": "", "created_at": now_iso(),
        })

    # Vestibulares
    vests = [
        {"nome": "UFU - Universidade Federal de Uberlândia", "data_prova": (today + timedelta(days=180)).isoformat(), "conteudos": "Foco em Biologia, Química e Redação dissertativa", "datas": "Inscrição em Junho, Prova em Outubro", "estrategias": "Resolver provas anteriores das últimas 5 edições", "observacoes": "Atenção à 2ª fase discursiva"},
        {"nome": "UNIMONTES", "data_prova": (today + timedelta(days=220)).isoformat(), "conteudos": "Conhecimentos gerais + redação", "datas": "Vestibular em Novembro", "estrategias": "Estudar autores mineiros para Literatura", "observacoes": ""},
        {"nome": "UFMG", "data_prova": (today + timedelta(days=160)).isoformat(), "conteudos": "ENEM + 2ª etapa específica", "datas": "Inscrição via SISU", "estrategias": "Maximizar nota no ENEM", "observacoes": "Pontuação de corte alta para Medicina"},
    ]
    for v in vests:
        await db.vestibulares.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, **v, "created_at": now_iso(),
        })

    # Calendar events
    eventos = [
        {"titulo": "Inscrição ENEM", "data": (today + timedelta(days=20)).isoformat(), "hora": None, "observacoes": "Prazo final"},
        {"titulo": "Simulado ENEM cursinho", "data": (today + timedelta(days=7)).isoformat(), "hora": "08:00", "observacoes": "Leve caneta preta"},
        {"titulo": "Aulão revisão Biologia", "data": (today + timedelta(days=14)).isoformat(), "hora": "19:00", "observacoes": ""},
    ]
    for e in eventos:
        await db.calendario.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, **e, "created_at": now_iso(),
        })

    # Notes (Notion-like)
    notas = [
        {"titulo": "Fórmulas Física A", "conteudo": "## Cinemática\n- v = v0 + at\n- s = s0 + v0*t + (a*t^2)/2\n- v² = v0² + 2a*Δs\n\n## Dinâmica\n- F = m*a\n- P = m*g"},
        {"titulo": "Resumo Redação ENEM", "conteudo": "## Competências\n1. Domínio da norma culta\n2. Compreensão do tema\n3. Argumentação\n4. Coesão\n5. Proposta de intervenção\n\nSempre trazer agente, ação, modo e detalhamento."},
    ]
    for n in notas:
        await db.notas.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, **n, "created_at": now_iso(),
        })

    # Flashcards: um deck + alguns cartões
    deck_id = str(uuid.uuid4())
    await db.flashcard_decks.insert_one({
        "id": deck_id, "user_id": user_id,
        "nome": "Biologia Celular", "materia": "Biologia", "frente": "Frente A",
        "descricao": "Citologia básica", "tags": ["citologia"],
        "created_at": now_iso(),
    })
    cartoes = [
        {"pergunta": "O que é mitose?", "resposta": "Divisão celular que gera duas células geneticamente iguais."},
        {"pergunta": "Qual a função do ribossomo?", "resposta": "Síntese proteica."},
        {"pergunta": "Onde ocorre a fotossíntese?", "resposta": "Nos cloroplastos."},
        {"pergunta": "Diferença entre mitose e meiose?", "resposta": "Mitose gera 2 células idênticas; meiose gera 4 gametas haploides."},
    ]
    for c in cartoes:
        await db.flashcards.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id,
            **c, "materia": "Biologia", "frente": "Frente A", "deck_id": deck_id,
            "tags": ["citologia"], "dificuldade": 0, "status": "novo",
            "intervalo": 0, "ease": 2.5, "proxima_revisao": today.isoformat(),
            "revisoes": 0, "acertos": 0, "erros": 0, "historico": [], "suspenso": False,
            "created_at": now_iso(),
        })

    logger.info("Demo user seeded.")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index([("user_id", 1), ("data", 1)])
    await db.revisoes.create_index([("user_id", 1)])
    await db.schedule.create_index([("user_id", 1), ("data", 1)])
    await db.questoes.create_index([("user_id", 1), ("data", 1)])
    await db.redacoes.create_index([("user_id", 1), ("data", 1)])
    await db.simulados.create_index([("user_id", 1), ("data", 1)])
    await db.vestibulares.create_index([("user_id", 1)])
    await db.calendario.create_index([("user_id", 1), ("data", 1)])
    await db.notas.create_index([("user_id", 1)])
    await db.conjuntos.create_index([("user_id", 1)])
    await db.flashcard_decks.create_index([("user_id", 1)])
    await db.flashcards.create_index([("user_id", 1), ("deck_id", 1)])
    await db.flashcards.create_index([("user_id", 1), ("proxima_revisao", 1)])
    await db.flashcard_reviews.create_index([("user_id", 1), ("data_iso", -1)])
    await db.profiles.create_index("user_id", unique=True)
    await seed_demo()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def health():
    return {"status": "ok", "app": "AprovaMed Planner"}


# ----------------------------------------------------------------------------
# Mount
# ----------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
