FROM mcr.microsoft.com/devcontainers/javascript-node:22-bullseye

# Root setup
USER root
RUN apt-get update && \
    apt-get install -y postgresql-client azure-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch back to non-root
USER node
WORKDIR /workspaces/staff-audit

# Do not copy or install yet — repo isn’t mounted during build
CMD [ "sleep", "infinity" ]
