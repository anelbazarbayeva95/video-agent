# Portable image for the Kadr backend. Works on Hugging Face Spaces (Docker
# SDK), Render, Cloud Run, or any Docker host. Installs ffmpeg (used for frame
# extraction) plus the Python deps, then serves the FastAPI app with uvicorn.
FROM python:3.11-slim

# ffmpeg is a hard dependency of the frame-extraction pipeline.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run the container as a non-root user (UID 1000). Match
# that so the image behaves identically locally and on the platform, and so
# writes to $HOME and /tmp (where the video temp files go) stay permitted.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user:user . .

# HF Spaces default to port 7860 (declared as app_port in README metadata).
# Render / Cloud Run inject their own $PORT, which overrides this at runtime.
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
