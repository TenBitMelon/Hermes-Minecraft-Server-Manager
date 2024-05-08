[![Docker Image CI](https://github.com/melonboy10/Hermes-Minecraft-Server-Manager/actions/workflows/docker-image.yml/badge.svg)](https://github.com/melonboy10/Hermes-Minecraft-Server-Manager/actions/workflows/docker-image.yml)

todo:

- [x] sibling container for database
- [x] stopping & zip file
- [x] deletion
- [ ] more server types
- [ ] file uploads
- [ ] world sources & downloading
- [x] server panel w/ stats
- [ ] authentication
- [ ] backup downloads
- [ ] more than one backup
- [x] better whitelist
- [ ] better server properties
- [x] Database error handling across the whole project

# Hermes Minecraft Server Manager

Hermes Minecraft Server Manager is a tool for managing Minecraft servers. It provides a web interface for server management and uses Docker to run the servers.

## Getting Started

### Installation for Hosting

1. Install Docker and Docker Compose
2. Copy the `docker-compose.yml` file from the repository
3. Configure the file to your liking, for more information see the [Configuration](#Configuration) section
4. Run `docker-compose up -d` to start the server
5. Access the server at `http://localhost:3000`

### Installation for Development

1. Clone the repository

```bash
git clone "https://github.com/melonboy10/Hermes-Minecraft-Server-Manager.git"
```

2. Install the dependencies

```bash
cd Hermes-Minecraft-Server-Manager
pnpm install
```

3. Start the server, this will start the server and the database

```bash
pnpm dev
```

4. Access the server at `http://localhost:5173` and the database at `http://localhost:8090`

## Configuration

The `docker-compose.yml` file is used to configure the server. The following is an example configuration:

```yml
version: '3'
services:
  app:
    image: 'melonboy10/hermes-minecraft-server-manager:latest'
    container_name: 'hermes-mcsm'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./servers:/app/servers
      # Database volume
      # This will store all fo the database data outside the container
      # allowing it to persist between restarts.
      - ./database:/app/database/pb_data
    ports:
      # The website will be accessible at http://localhost:3000 by default
      # and you can setup a reverse proxy to change the domain.
      # Just make sure to change the PUBLIC_ROOT_DOMAIN environment variable
      #
      # Website external port (changeable) : internal port (don't change)
      - '3000:3000'
      # The database will be accessible at http://localhost:8090 by default
      # and I don't recommend making it public. Because you can manage most
      # of the necessary things from the website.
      #
      # Database external port (changeable) : internal port (don't change)
      - '8090:8090'
    environment:
      # The following environment variables are required for the server to run

      # This is the public domain that the server will be accessible at
      # This is used for generating the server URLs and for the Cloudflare API
      # This should be the domain that the server is accessible at from the internet
      - PUBLIC_ROOT_DOMAIN=example.com

      # The port range that the server will use for the public servers.
      # This should be changed based on how many servers you want to allow
      # and how many ports you have open on your server.
      - PUBLIC_PORT_MIN=25565
      - PUBLIC_PORT_MAX=25565

      # This is the default icon for the servers and can be changed to any URL.
      # A default icon is included with the container, feel free the change it.
      - PUBLIC_DEFAULT_ICON_URL=https://example.com/icon.png

      # This variable allows you to control how long you want to keep stopped servers
      # before they are deleted. This is in hours and the default is 168 hours (1 week).
      # If you don't want to delete servers, set this to -1.
      - PUBLIC_TIME_UNTIL_DELETION_AFTER_SHUTDOWN=168 # In hours

      # These are the Cloudflare API keys that are used for managing the DNS records
      # This is used for creating the subdomains for the servers.
      # You can get these from the Cloudflare dashboard and setup a token with the necessary permissions.
      - CLOUDFLARE_TOKEN=<token>
      - CLOUDFLARE_ZONE_ID=<zone_id>

      # Default user account for managing the database
      # This is the default user account for managing the database used by the server internally
      # Feel free to change the email and password, it will create the account if it doesn't exist
      - POCKETBASE_INTERNAL_ADMIN_EMAIL=internal@example.com
      - POCKETBASE_INTERNAL_ADMIN_PASSWORD=password

    restart: unless-stopped
```
