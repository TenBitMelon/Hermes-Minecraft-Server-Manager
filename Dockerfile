FROM node:22.18.0-alpine3.21
WORKDIR /app
RUN apk add --no-cache bash docker-cli docker-cli-compose zip unzip curl ca-certificates \
    && npm install --global pnpm@11.8.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ARG PB_VERSION=0.22.8
ARG TARGETARCH
RUN arch="${TARGETARCH:-$(uname -m)}"; \
    case "$arch" in aarch64) arch=arm64 ;; x86_64) arch=amd64 ;; esac; \
    curl --fail --location --retry 3 \
      "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${arch}.zip" \
      --output /tmp/pb.zip \
    && unzip /tmp/pb.zip pocketbase -d ./database/ && rm /tmp/pb.zip
EXPOSE 3000 8090
CMD ["node", "docker/start.mjs"]
