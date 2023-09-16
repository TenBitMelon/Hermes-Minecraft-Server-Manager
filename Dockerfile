# Dockerfile
FROM oven/bun
WORKDIR /app

ENV PUBLIC_ROOT_DOMAIN=example.com
ENV PUBLIC_PORT_MIN=25565
ENV PUBLIC_PORT_MAX=25565

ENV CLOUDFLARE_TOKEN=""
ENV CLOUDFLARE_ZONE_ID=""

ENV POCKETBASE_INTERNAL_ADMIN_EMAIL=""
ENV POCKETBASE_INTERNAL_ADMIN_PASSWORD=""

### DATABASE SETUP

ARG PB_VERSION=0.18.3

RUN apt-get update && apt-get install -y unzip ca-certificates

# download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d ./database/

# Database internal port
EXPOSE 8090

### WEBSITE SETUP
COPY package.json ./
RUN bun install

# Copy all files except the ones in .dockerignore
COPY . .
RUN ./database/pocketbase serve & \
  bun run build; \
  wait -n; \
  exit $?

# Website internal port
EXPOSE 3000

RUN rm -rf node_modules
RUN bun install --production

### DOCKER COMPOSE SETUP

ADD https://get.docker.com/ /tmp/get-docker.sh
RUN chmod +x /tmp/get-docker.sh
RUN /tmp/get-docker.sh
# Disable docker systemctl
RUN systemctl stop docker
RUN systemctl mask docker

# Run both the website and the database
CMD bun run ./build/index.js & \
  ./database/pocketbase serve; \
  wait -n; \
  exit $?