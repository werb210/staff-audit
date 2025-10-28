# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:22-bullseye

# Root setup
USER root
RUN apt-get update && \
    apt-get install -y postgresql-client azure-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch back to non-root
USER node
WORKDIR /workspaces/staff-audit

# ✅ Copy dependency manifests into build context before install
COPY package*.json ./

# Install dependencies
RUN npm ci || npm i

# Default command for dev container
CMD ["bash"]
