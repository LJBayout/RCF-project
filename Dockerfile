# Node from MCR (avoids Docker Hub pull issues)
FROM mcr.microsoft.com/devcontainers/javascript-node:20
USER root
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm install && npm run dev"]
