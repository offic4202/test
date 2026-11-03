# Play Station

Play Station is a self-hosted live-channel dial. It reads the public [iptv-org](https://github.com/iptv-org) channel database, stream directory, and guide index, then keeps channels that still have a link and match one of these:

- broadcast from Nigeria
- broadcast from another African country
- tagged English
- tagged with an African language (Hausa, Yoruba, Igbo, Pidgin, Swahili, and the rest of the set in `src/lib/station.ts`)

Adult listings are left out. Shelves cover cartoons, music, local pictures, foreign pictures, news, sports, and the other categories in that directory. The map groups channels by African region.

Trending is local. A play is counted when a feed starts, and a return is counted when the same browser comes back to that channel. Until someone watches, the home dial shows an opening lineup instead of a fake chart.

The guide panel shows now-and-next when iptv-org publishes a schedule file for that channel. Today most guide records only name the external listing, and the station says so.

Play Station does not host, index, or check movie download files.

The app is HTTP only. On the VPS, WireGuard is the private path and Nginx Proxy Manager is the public HTTPS front. This repo does not run WireGuard or Nginx Proxy Manager; those stay the services you already operate.

## Develop in a container

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml -f docker-compose.wireguard.yml up
```

On a laptop, leave `BIND_ADDRESS` unset and skip the wireguard file. The dev server is then at `http://127.0.0.1:47231`.

```bash
docker compose -f docker-compose.dev.yml up
```

The repo is mounted into the container. Saves reload the Next.js dev server. `data/` on the host holds the iptv-org cache, the audience log, and the signing secret. The first request downloads the directory from `https://iptv-org.github.io/api` if `data/catalog` is empty.

To develop on the VPS through your domain, attach the same network Nginx Proxy Manager uses:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.npm.yml up
```

Set `NPM_NETWORK` and `ALLOWED_DEV_ORIGINS` in `.env`. In the proxy host, forward to `http://play-station:47231`, scheme `http`, and turn **Websockets Support** on so the dev reload socket connects. Stop this container before starting the production one. Both use the name `play-station`.

`npm run dev` on the host is the same server, bound to port 47231, if you would rather not use Docker for a local pass.

## Upload the zip to the VPS

Test domain: `playstation.9ja.space`.

In the DNS zone for `9ja.space`, add:

| Type | Name | Value |
| --- | --- | --- |
| A | playstation | the VPS public IPv4 |

Wait until `dig +short playstation.9ja.space` prints that address. Nginx Proxy Manager has to be the process listening on ports 80 and 443 of that public address. This container does not bind those ports.

On the VPS:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 unzip
sudo systemctl enable --now docker

sudo mkdir -p /opt/play-station
sudo unzip -o play-station-vps.zip -d /opt/play-station
cd /opt/play-station
sudo cp .env.example .env
sudo nano .env
```

In `.env`, set `DESK_PASSWORD` to a long passphrase. Set `NPM_NETWORK` to the network Nginx Proxy Manager already uses:

```bash
sudo docker network ls
```

Then:

```bash
sudo sh scripts/vps-up.sh
```

Or, if you already wrote the network name into `.env`:

```bash
sudo docker compose -f docker-compose.yml -f docker-compose.npm.yml up -d --build
```

The first build compiles the app on the VPS. The first visit downloads the iptv-org directory into the `station-data` volume.

### Proxy host in Nginx Proxy Manager

Hosts → Proxy Hosts → Add Proxy Host.

| Field | Value |
| --- | --- |
| Domain names | playstation.9ja.space |
| Scheme | http |
| Forward hostname / IP | play-station |
| Forward port | 47231 |
| Block common exploits | on |
| Websockets support | on |

SSL tab: Request a new SSL certificate, Force SSL, HTTP/2 Support, and accept the Let's Encrypt terms. Use the email you already use for certificates.

Advanced tab:

```nginx
proxy_buffering off;
proxy_request_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
client_max_body_size 1m;
```

Open `https://playstation.9ja.space`. The station desk is `https://playstation.9ja.space/desk`.

If the proxy host cannot reach `play-station`, the container is not on NPM's docker network. Check `docker network ls`, put that name in `NPM_NETWORK`, and run `scripts/vps-up.sh` again.

`GET /api/health` is the container healthcheck.

The audience log and signing secret live in the `station-data` volume (`/app/data` in the container). The directory refreshes from iptv-org when the process starts and the cache is older than 12 hours. The desk can read it again sooner.

## The desk

`/desk` is the management page for this service. It asks for `DESK_PASSWORD`. Once open it shows:

- plays and return visits stored on this server
- how many channels have been watched
- how many channels are on the dial, including Nigeria and the rest of Africa
- when the iptv-org directory was last read
- a button to read that directory again

Nginx Proxy Manager remains the panel for the domain, the certificate, and the proxy. Play Station does not include ad slots or an ads.txt file. Plays and returns on the desk are the traffic record.

## What is stored

| Path | Purpose |
| --- | --- |
| `data/catalog` | Cached iptv-org JSON |
| `data/audience.json` | Plays and return visits |
| `data/secret` | HMAC key for the stream relay |

The relay only fetches URLs signed by this server, and it refuses private and link-local addresses.
