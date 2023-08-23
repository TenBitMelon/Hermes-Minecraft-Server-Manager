# Dockerfile

FROM node:16-alpine

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Website internal port
EXPOSE 3000
CMD ["node", "build"]