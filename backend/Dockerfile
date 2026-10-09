FROM python:3.12-slim
WORKDIR /service
COPY pyproject.toml ./
COPY app ./app
COPY evaluation.json ./evaluation.json
RUN pip install --no-cache-dir . && useradd --uid 10001 --create-home appuser
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
