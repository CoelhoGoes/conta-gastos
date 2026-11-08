FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /code

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

EXPOSE 8000
# As migrações rodam antes do servidor: o app não cria mais schema sozinho.
# --forwarded-allow-ips='*': atrás do proxy da hospedagem, o IP real do cliente vem no
# X-Forwarded-For, e o limitador de login conta por ele. Só é seguro enquanto a API não
# for acessível sem passar pelo proxy — numa VPS exposta direto, qualquer um forjaria o IP.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --forwarded-allow-ips='*'"]
