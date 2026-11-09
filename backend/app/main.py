import os

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import auth, finance

# O schema é criado e alterado por migrações do Alembic (`alembic upgrade head`,
# que o CMD do Dockerfile roda antes do servidor). Não use create_all aqui: os dois
# em paralelo fazem o schema do código divergir do banco em silêncio.

app = FastAPI(title="Gestão Financeira", version="0.1.0")

# O corpo é recusado pelo cabeçalho, antes de ser lido: o 413 do upload de OFX em finance.py
# só dispara depois que o arquivo inteiro chegou. O dobro do limite do OFX deixa passar a
# confirmação do mesmo extrato, que vai em JSON e ocupa mais que o arquivo.
MAX_BODY_BYTES = 2 * finance.MAX_UPLOAD_BYTES


# Registrado antes do CORS, que fica por fora dele: sem os cabeçalhos do CORS, o navegador
# esconde o 413 do frontend e a tela mostra um erro de rede.
@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    length = request.headers.get("content-length")
    # Sem Content-Length (corpo em chunks) não há como saber o tamanho antes de ler, e o
    # navegador sempre manda o cabeçalho num fetch comum.
    if length is None and "chunked" in request.headers.get("transfer-encoding", "").lower():
        return JSONResponse(
            {"detail": "Envie o tamanho da requisição (Content-Length)."},
            status_code=status.HTTP_411_LENGTH_REQUIRED,
        )
    if length is not None and int(length) > MAX_BODY_BYTES:
        return JSONResponse(
            {"detail": f"Requisição maior que {MAX_BODY_BYTES // 1024 // 1024} MB."},
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        )
    return await call_next(request)


allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(finance.router)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok"}
