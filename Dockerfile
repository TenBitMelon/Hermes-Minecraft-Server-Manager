### DOCKER ###

# Dockerfile
FROM docker:24.0.6-alpine3.18
WORKDIR /app
RUN apk add --no-cache bash
SHELL [ "/bin/bash", "-c" ]

### BUN SETUP
ENV NODE_VERSION 20.3.0

RUN addgroup -g 1000 node \
  && adduser -u 1000 -G node -s /bin/sh -D node \
  && apk add --no-cache \
  libstdc++ \
  && apk add --no-cache --virtual .build-deps \
  curl \
  && ARCH= && alpineArch="$(apk --print-arch)" \
  && case "${alpineArch##*-}" in \
  x86_64) \
  ARCH='x64' \
  CHECKSUM="f3ad9443e8d9d53bfc00ec875181e9dc2ccf86205a50fce119e0610cdba8ccf1" \
  ;; \
  *) ;; \
  esac \
  && if [ -n "${CHECKSUM}" ]; then \
  set -eu; \
  curl -fsSLO --compressed "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz"; \
  echo "$CHECKSUM  node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs; \
  else \
  echo "Building from source" \
  # backup build
  && apk add --no-cache --virtual .build-deps-full \
  binutils-gold \
  g++ \
  gcc \
  gnupg \
  libgcc \
  linux-headers \
  make \
  python3 \
  # use pre-existing gpg directory, see https://github.com/nodejs/docker-node/pull/1895#issuecomment-1550389150
  && export GNUPGHOME="$(mktemp -d)" \
  # gpg keys listed at https://github.com/nodejs/node#release-keys
  && for key in \
  4ED778F539E3634C779C87C6D7062848A1AB005C \
  141F07595B7B3FFE74309A937405533BE57C7D57 \
  74F12602B6F1C4E913FAA37AD3A89613643B6201 \
  DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 \
  61FC681DFB92A079F1685E77973F295594EC4689 \
  8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
  C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
  890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
  C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
  108F52B48DB57BB0CC439B2997B01419BD92F80A \
  ; do \
  gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" || \
  gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION.tar.xz" \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
  && gpgconf --kill all \
  && rm -rf "$GNUPGHOME" \
  && grep " node-v$NODE_VERSION.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xf "node-v$NODE_VERSION.tar.xz" \
  && cd "node-v$NODE_VERSION" \
  && ./configure \
  && make -j$(getconf _NPROCESSORS_ONLN) V= \
  && make install \
  && apk del .build-deps-full \
  && cd .. \
  && rm -Rf "node-v$NODE_VERSION" \
  && rm "node-v$NODE_VERSION.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt; \
  fi \
  && rm -f "node-v$NODE_VERSION-linux-$ARCH-musl.tar.xz" \
  && apk del .build-deps \
  # smoke tests
  && node --version \
  && npm --version

ENV YARN_VERSION 1.22.19

RUN apk add --no-cache --virtual .build-deps-yarn curl gnupg tar \
  # use pre-existing gpg directory, see https://github.com/nodejs/docker-node/pull/1895#issuecomment-1550389150
  && export GNUPGHOME="$(mktemp -d)" \
  && for key in \
  6A010C5166006599AA17F08146C2130DFD2497F5 \
  ; do \
  gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" || \
  gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz" \
  && curl -fsSLO --compressed "https://yarnpkg.com/downloads/$YARN_VERSION/yarn-v$YARN_VERSION.tar.gz.asc" \
  && gpg --batch --verify yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  && gpgconf --kill all \
  && rm -rf "$GNUPGHOME" \
  && mkdir -p /opt \
  && tar -xzf yarn-v$YARN_VERSION.tar.gz -C /opt/ \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarn /usr/local/bin/yarn \
  && ln -s /opt/yarn-v$YARN_VERSION/bin/yarnpkg /usr/local/bin/yarnpkg \
  && rm yarn-v$YARN_VERSION.tar.gz.asc yarn-v$YARN_VERSION.tar.gz \
  && apk del .build-deps-yarn \
  # smoke test
  && yarn --version

### WEBSITE SETUP
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install

# Copy all files except the ones in .dockerignore
COPY . .
RUN pnpm run build
EXPOSE 3000

### DATABASE SETUP
ARG PB_VERSION=0.18.3
RUN apk add --no-cache ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d ./database/
EXPOSE 8090

### RUN BOTH
CMD ORIGIN=https://$PUBLIC_ROOT_DOMAIN node build & \
  if [ -n "$POCKETBASE_INTERNAL_ADMIN_EMAIL" ] && [ -n "$POCKETBASE_INTERNAL_ADMIN_PASSWORD" ]; then \
  ORIGIN=https://$PUBLIC_ROOT_DOMAIN ./database/pocketbase serve --http=0.0.0.0:8090; \
  else \
  echo "PocketBase admin credentials not set. Skipping database startup."; \
  fi

### NODE ###

# # Dockerfile
# FROM node:20-alpine3.17
# WORKDIR /app
# RUN apk add --no-cache bash
# SHELL [ "/bin/bash", "-c" ]

# RUN npm install -g pnpm
# COPY package.json ./
# RUN pnpm install

# # Copy all files except the ones in .dockerignore
# COPY . .
# RUN pnpm run build

# # Website internal port
# EXPOSE 3000

# ### DATABASE SETUP

# ARG PB_VERSION=0.18.3
# RUN apk add --no-cache unzip ca-certificates

# # download and unzip PocketBase
# ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
# RUN unzip /tmp/pb.zip -d ./database/

# # Database internal port
# EXPOSE 8090

# ### DOCKER COMPOSE SETUP
# # RUN http://ftp.halifax.rwth-aachen.de/alpine/v3.16/main >> /etc/apk/repositories; \
# #   http://ftp.halifax.rwth-aachen.de/alpine/v3.16/community >> /etc/apk/repositories; \
# #   apk update; \
# #   apk add --no-cache docker docker-compose-plugin

# # Run both the website and the database
# CMD ORIGIN=https://$PUBLIC_ROOT_DOMAIN node build & \
#   if [ -n "$POCKETBASE_INTERNAL_ADMIN_EMAIL" ] && [ -n "$POCKETBASE_INTERNAL_ADMIN_PASSWORD" ]; then \
#   ./database/pocketbase serve --http=0.0.0.0:8090; \
#   else \
#   echo "PocketBase admin credentials not set. Skipping database startup."; \
#   fi

### BUN ###

# # Dockerfile
# FROM oven/bun
# WORKDIR /app
# SHELL [ "/bin/bash", "-c" ]

# ### WEBSITE SETUP
# COPY package.json ./
# RUN bun install

# # Copy all files except the ones in .dockerignore
# COPY . .
# RUN bun run build

# # Website internal port
# EXPOSE 3000

# # RUN rm -rf node_modules
# # RUN bun install --production

# ### DATABASE SETUP

# ARG PB_VERSION=0.18.3

# RUN apt-get update && apt-get install -y unzip ca-certificates

# # download and unzip PocketBase
# ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
# RUN unzip /tmp/pb.zip -d ./database/

# # Database internal port
# EXPOSE 8090

# ### DOCKER COMPOSE SETUP

# ADD https://get.docker.com/ /tmp/get-docker.sh
# RUN chmod +x /tmp/get-docker.sh
# RUN /tmp/get-docker.sh
# # Disable docker systemctl
# RUN systemctl mask docker

# # Run both the website and the database
# CMD ORIGIN=https://$PUBLIC_ROOT_DOMAIN bun run ./build/index.js & \
#   if [ -n "$POCKETBASE_INTERNAL_ADMIN_EMAIL" ] && [ -n "$POCKETBASE_INTERNAL_ADMIN_PASSWORD" ]; then \
#   ORIGIN=https://$PUBLIC_ROOT_DOMAIN ./database/pocketbase serve --http=0.0.0.0:8090; \
#   else \
#   echo "PocketBase admin credentials not set. Skipping database startup."; \
#   fi