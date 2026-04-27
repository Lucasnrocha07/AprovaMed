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
    c1: int = 0
    c2: int = 0
    c3: int = 0
    c4: int = 0
    c5: int = 0
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
    estrategias: str = ""
    observacoes: str = ""


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
make_crud("questoes", "questoes", QuestionIn)
make_crud("redacoes", "redacoes", RedacaoIn)
make_crud("simulados", "simulados", SimuladoIn)
make_crud("vestibulares", "vestibulares", VestibularIn)


# Override questoes/redacoes/simulados create to compute derived fields
@api.post("/questoes/compute", include_in_schema=False)
async def _noop():
    return {}


# Patch: post-process for computed fields after insert. We can update doc on create:
# To keep things simple we add explicit endpoints that compute extras
@api.post("/questoes2")
async def create_questao(body: QuestionIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["erros"] = max(body.quantidade - body.acertos, 0)
    doc["percentual"] = round((body.acertos / body.quantidade) * 100, 2) if body.quantidade else 0
    doc["created_at"] = now_iso()
    await db.questoes.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.post("/redacoes2")
async def create_redacao(body: RedacaoIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["nota_total"] = body.c1 + body.c2 + body.c3 + body.c4 + body.c5
    doc["created_at"] = now_iso()
    await db.redacoes.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.post("/simulados2")
async def create_simulado(body: SimuladoIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["erros"] = max(body.total_questoes - body.acertos, 0)
    doc["percentual"] = round((body.acertos / body.total_questoes) * 100, 2) if body.total_questoes else 0
    doc["created_at"] = now_iso()
    await db.simulados.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


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

    # Progresso até a prova
    dias_restantes = None
    if profile.get("prova_data"):
        try:
            d = datetime.fromisoformat(profile["prova_data"]).date()
            dias_restantes = (d - date.today()).days
        except Exception:
            dias_restantes = None

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
        {"nome": "UFU - Universidade Federal de Uberlândia", "conteudos": "Foco em Biologia, Química e Redação dissertativa", "datas": "Inscrição em Junho, Prova em Outubro", "estrategias": "Resolver provas anteriores das últimas 5 edições", "observacoes": "Atenção à 2ª fase discursiva"},
        {"nome": "UNIMONTES", "conteudos": "Conhecimentos gerais + redação", "datas": "Vestibular em Novembro", "estrategias": "Estudar autores mineiros para Literatura", "observacoes": ""},
        {"nome": "UFMG", "conteudos": "ENEM + 2ª etapa específica", "datas": "Inscrição via SISU", "estrategias": "Maximizar nota no ENEM", "observacoes": "Pontuação de corte alta para Medicina"},
    ]
    for v in vests:
        await db.vestibulares.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_id, **v, "created_at": now_iso(),
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
