FROM python:3.11.9-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg espeak-ng \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir whisperx bournemouth-forced-aligner fastapi uvicorn python-multipart prometheus_client

# Pre-download tiny model at build time — avoids first-startup download.
# WHISPERX_MODEL env var can override to 'small' or 'base' if needed.
RUN python -c "import whisperx; whisperx.load_model('tiny', 'cpu', compute_type='int8')"

WORKDIR /app
COPY main.py .

RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${BFA_WORKERS:-1}"]
