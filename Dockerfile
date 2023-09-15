# Dockerfile

FROM oven/bun

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