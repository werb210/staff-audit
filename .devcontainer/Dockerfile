FROM mcr.microsoft.com/devcontainers/javascript-node:22-bullseye

USER root
RUN apt-get update && \
    apt-get install -y postgresql-client azure-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /workspaces/staff-audit

# don't install here — repo not mounted yet
CMD ["sleep", "infinity"]
