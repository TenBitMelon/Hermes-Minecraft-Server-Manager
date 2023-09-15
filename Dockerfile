# Dockerfile
FROM oven/bun

ENV PUBLIC_ROOT_DOMAIN=example.com
ENV PUBLIC_PORT_MIN=25565
ENV PUBLIC_PORT_MAX=25565

ENV CLOUDFLARE_TOKEN=""
ENV CLOUDFLARE_ZONE_ID=""

ENV POCKETBASE_INTERNAL_ADMIN_EMAIL=""
ENV POCKETBASE_INTERNAL_ADMIN_PASSWORD=""


### WEBSITE SETUP
WORKDIR /app
COPY package.json ./
RUN bun install

# Copy all files except the ones in .dockerignore
COPY . .
RUN bun run build

# Website internal port
EXPOSE 3000

RUN rm -rf node_modules
RUN bun install --production

### DATABASE SETUP

ARG PB_VERSION=0.18.3

RUN apk add --no-cache \
  unzip \
  ca-certificates

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d ./database/

# Copy migrations schema
COPY ./database/pb_migrations/ ./database/pb_migrations/

# Database internal port
EXPOSE 8090

### DOCKER COMPOSE SETUP

ADD https://get.docker.com/ /tmp/get-docker.sh
RUN chmod +x /tmp/get-docker.sh
RUN /tmp/get-docker.sh
# Disable docker systemctl
RUN systemctl stop docker
RUN systemctl mask docker

# Run both the website and the database
CMD bun run ./build & \
  ./database/pocketbase serve; \
  wait -n; \
  exit $?