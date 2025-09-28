# How and Why I Set up Immich, a Google Photos Replacement

Have you heard of [Immich](https://immich.app/)? I hadn't, until recently: it's an open-source, self-hosted photo site with support for context searching (search for "dog" to find photos of dogs), facial recognition, and indexing of locations and date to make photos and movies searchable by those details.

You can see their [demo app](https://demo.immich.app/) to get a feel for just how much parity it has with Google Photos - it's extremely impressive, and 

## Why I Decided to Set Up Immich

There are a few reasons I decided to set up Immich:

* I have photos scattered across multiple places - social media, Google Photos, some server drives, and some online storage drives, and I want them all in one place
* I want my photos, once in all in one place, to be easily accessible - from my phone, from a browser - and searchable so that I can find that one photo that one time I did that thing at that place
* I want to feed that photo storage into a backup strategy so that I have a way of recovering all my photos should disaster strike

### So Why Not Google Photos?

Increasingly, I have been tryin to reduce my reliance on Google as the sole provider for all things in my life (navigation, e-mail, calendar, task list, notes, and, in this case, photos). Putting all the eggs of my life in one basket like that is putting myself in a position that, should I ever cross Google's terms of use (or if someone should decide that I have, regardless of the truthiness of such a claim), I'm liable to lose a substantial part of my ability to engage with matters of my personal life.

Besides, who is the last common individual you've heard of who successfully got in touch with someone at Google to fix a problem - and, if you have heard of such an individual, did you only hear about it because it was notable for their success in getting in touch with someone at Google?

To that end, I've been slowly unwinding myself from the Google ecosystem, and Immich is my latest step in doing so.

## My Immich Setup

In this post, I am going to detail my work to run an instance of Immich from my home that is Internet-accessible over an HTTPS connection, with automated periodic backups to remote storage.

All together, this took me a few hours to set up - but, ideally, with this guide, you'll be up and running within 30 minutes, as I hope to impart upon you here the lessons I've learned without requiring you to learn them the same long, troubled way I did.

### Prerequisites

Here's what you'll need in order to be able to do this (or, at least, do it like I did):

* A Raspberry Pi 4 (or later, if you wish)
  * I recommend getting a case with good passive or even active cooling (I got [this one](https://geekworm.com/products/raspberry-pi-4-heavy-duty-aluminum-passive-cooling-metal-case)), because the running of Immich keeps your Pi pretty warm
  * It's uncommon for this not to be the case, but you must have SSH access with a user with sudo privileges in order to be able to follow this guide. I wouldn't expect anything else to be the case for *your* Raspberry Pi, but I'll call it out here, nonetheless.
* An external hard drive
  * I used a [compatily LV22 16 TB external disk drive](https://www.amazon.com/compatily-LV22-USB-C-10Gbps-External/dp/B0BPYPLL8K), but that's solely because I had it left over after I did a reformat of a media server. You can find plenty of .m2 drive storage accessories and other ways to store your photos on your Pi.
  * For the purposes of this blog, I will assume that you have already formatted your storage
    * In my case, I created two partitions and mounted them at `/media/immich` and `/media/photos` - the former for hosting Immich's files and the latter for hosting photos
    * I opted for storing Immich's data on something other than the SD card hosting the OS to keep my Immich installation separate from my OS, should I ever need to update my OS (which amounts to, in the Raspberry Pi world, a complete format of the card and installation of the new OS), which prevents loss of Immich data in such a case.
* A router that allows you to set up port forwarding (some people use their ISP's router, which are locked down)
  * Even if you can't access the port forwarding settings on your router, this simply means that you can't make your Immich instance Internet-accessible. It does not mean that you cannot set up Immich to be accessible within your own home network.
  * **Note**: Immich does not like being co-hosted with other services - that is to say, Immich will _not_ work if you have it running at a path of anything other `/` (i.e., don't try to run it at https://yourdns.net/photos - only https://yourdns.net/). You cannot have any other services exposed through your public address.

### Caveats

There are a lot of things I did during this that I do not describe here, such as trying out rootless executions of Docker containers. I do not document these things because such follies made for some nightmarish things I had to figure out how to back out of. I note these absences _only_ to set the context here that there is a possibility that I missed something in try to post-hoc compile the steps that I took and present them in a way that helps you avoid my headaches. If that does end up being the case, please feel free to use the "report an issue" link in this page.

### Steps

The following are the ordered steps you can follow to install and set up Immich.

#### Install Docker

If you have not already, install Docker on your Pi. You can read up on how to do that [here](https://raspberrytips.com/docker-on-raspberry-pi/), but, as the article itself says, you can install it with just two commands:

```
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

#### Install Immich

Immich has a [getting started](https://docs.immich.app/overview/quick-start/) guide you can follow. I, however, went a little bit beyond what they do. Please feel free to follow their guide, here, as what I did _did_ vastly complicate the setup, though to a degree that I felt necessary for my own desire for system security beyond the defaults that Immich provides.

If you don't want to do the convoluted security things I did, you can simply follow Immich's guide and skip to [Running and Initial Setup of Immich](#running-and-initial-setup-of-immich).

##### Create Immich User

I first created an `immich` user and group under which the containers would run. Rather than running the containers as my current user (which has sudo privileges), I run the containers as this more-limited user so that, if there are any exploits of Immich (due to its Internet-visible nature), the extent of the damage that can be done is limited. To create this user and group, I ran the following command:

```
sudo adduser immich immich
```

I then make that user the owner of the `/media/immich` mountpoint to allow it to write the Immich data there:

```
sudo chown -R immich:immich /media/immich
```

##### Set Up Data Directories

In order to ensure that the Docker containers can read from and write to the directories that they will need (per my setup in the `docker-compose.yml` file, described further below), I created some data directories and ensured proper ownership:

```
sudo mkdir redis
sudo chown immich:immich redis
```

I also created a directory for, eventually, storing machine learning (ML) caching:

```
mkdir -p /media/immich/model-cache
sudo chown immich:immich /media/immich/model-cache
```

##### Download, Modify Docker Compose

I first download the `docker-compose.yml` file provided by Immich as the `immich` user:

```
sudo -S -u immich wget -O docker-compose.yml https://github.com/immich-app/immich/releases/latest/download/docker-compose.yml
```

I then modified it to fit my needs:

```
sudo -S -u immich pico docker-compose.yml
```

It resulted in the following file:

```
name: immich

services:
  immich-server:
    user: "1001:1001" # immich:immich
    container_name: immich_server
    image: ghcr.io/immich-app/immich-server:${IMMICH_VERSION:-release}
    volumes:
      # Do not edit the next line. If you want to change the media storage location on your system, edit the value of UPLOAD_LOCATION in the .env file
      - ${UPLOAD_LOCATION}:/data
      - /etc/localtime:/etc/localtime:ro
    env_file:
      - .env
    ports:
      - '2283:2283'
    depends_on:
      - redis
      - database
    restart: always
    healthcheck:
      disable: false

  immich-machine-learning:
    container_name: immich_machine_learning
    user: "1001:1001" # immich:immich
    image: ghcr.io/immich-app/immich-machine-learning:${IMMICH_VERSION:-release}
    volumes:
      - model-cache:/cache
    tmpfs:
      # Needed so that /tmp is writable for the user
      /tmp:uid=1001,gid=1001
    env_file:
      - .env
    environment:
      # Needed so that the cache data is written to the writable location data, rather than a default directory
      - MPLCONFIGDIR=/cache/.matplotlib
      - HF_HOME=/cache/.huggingface
    restart: always
    healthcheck:
      disable: false

  redis:
    container_name: immich_redis
    user: "1001:1001" # immich:immich
    image: docker.io/valkey/valkey:8-bookworm@sha256:fea8b3e67b15729d4bb70589eb03367bab9ad1ee89c876f54327fc7c6e618571
    healthcheck:
      test: redis-cli ping || exit 1
    restart: always
    volumes:
      - ./redis:/data

  database:
    container_name: immich_postgres
    user: "1001:1001" # immich:immich
    image: ghcr.io/immich-app/postgres:14-vectorchord0.4.3-pgvectors0.2.0@sha256:8d292bdb796aa58bbbaa47fe971c8516f6f57d6a47e7172e62754feb6ed4e7b0
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_DB: ${DB_DATABASE_NAME}
      POSTGRES_INITDB_ARGS: '--data-checksums'
    volumes:
      # Do not edit the next line. If you want to change the database storage location on your system, edit the value of DB_DATA_LOCATION in the .env file
      - ${DB_DATA_LOCATION}:/var/lib/postgresql/data
    shm_size: 128mb
    restart: always

volumes:
  model-cache:
    driver: local
    driver_opts:
      type: none
      device: /media/immich/model-cache
      o: bind
```

###### Docker Compose Differences

The changes I made were:

* Run every container as `user: "1001:1001"`, which runs the containers as the new user and group `immich` (the user and group just happen to have the same IDs since these were the first user and group I ever created on this machine)
* Within `immich-machine-learning`, I added the following to create a temporary file system, which allows the machine learning (ML) image to temporarily download its models when the first ML jobs are executed. Without this, the attempts by its Python scripts to download the files failed due to not being able to write to the _actual_ `/tmp` folder as the `immich` user:
```
tmpfs:
    # Needed so that /tmp is writable for the user
    /tmp:uid=1001,gid=1001
```
* Added the following to the ML image so that its caching of data was stored on a location that was writable to by the `immich` user:
```
environment:
    # Needed so that the cache data is written to the writable location data, rather than a default directory
    - MPLCONFIGDIR=/cache/.matplotlib
    - HF_HOME=/cache/.huggingface
```
* To the Redis image, I added the following so that it writes its Redis data to a place that the `immich` user has write access:
```
volumes:
    - ./redis:/data
```
* Finally, at the bottom, I added the following so that the ML caches are persisted to the `/media/immich` mountpoint:
```
volumes:
  model-cache:
    driver: local
    driver_opts:
      type: none
      device: /media/immich/model-cache
      o: bind
```

##### Set Up Configuration

As described on Immich's site, download an example `.env` file into the same directory as your `docker-compose.yml` file (which, if you're following me, should be on `/media/immich`):

```
wget -O .env https://github.com/immich-app/immich/releases/latest/download/example.env
```

Follow the instructions on [Immich's site](https://docs.immich.app/overview/quick-start/#step-2---populate-the-env-file-with-custom-values) to set up a `.env` file. `UPLOAD_LOCATION` should be set to `/media/photos/library`. This will result in some redundant `/media/photos/library/library` folders, but it prevents Immich from co-locating its data with other data that may get written to the broader `/media/photos` directory (should you ever choose to do so - it's your system to do with as you please).

##### Running and Initial Setup of Immich

Once you have this all set up, you can just run the following to start Immich:

```
docker compose up -d
```

It may take a few minutes to get everything set up. If something doesn't work, please feel free to post a question using the "report an issue" link in this page. Once everything is healthy, you should be able to reach Immich here:

```
http://RASPBERRY_PI_IP_ADDRESS:2283
```

Immich will, at this point, walk you through setting up your Immich instance.

Once you've got it set up, test the setup by trying to upload a photo. It should work; if it doesn't, feel free to join the Immich Discord server (linked on their site) for troubleshooting assistance - it's a lively server with a lot of helpful people.

#### Making Immich Internet-Accessible

Now that you've got Immich running on your Raspberry Pi, your next overall step is to make this Internet-accessible so that you can both find your photos on the go and upload them from your phone as background uploads. Do **not** simply open up port forwarding to port 2283 of your Immich instance! This will transmit all of your data in the clear, which means anyone on the WiFi networks you're on or any of the Internet infrastructure between you and your Immich instance can see what your photos (and, likely, login credentials) are!

The following steps will take you through being able to set up a publicly-visible website that uses SSL to encrypt your communciations for security. High level, the steps will be:

* Register a website address for your Immich instance through a free DNS provider
* Install a [reverse proxy](https://en.wikipedia.org/wiki/Reverse_proxy) (nginx)
* Set up an SSL certificate to secure your communications with the reverse proxy
* Finalize setup for your reverse proxy
* Set up automated DNS updates
* Forwarding the port on your router

##### Register a Website Address

You _can_ just go to your home's public IP address (e.g., https://67.264.47.217) to find your Immich instance (eventually), but:

* Numbers are hard to remember and easy to get wrong
* Most home Internet setups do not guarantee that your IP address will never change - and, if that happens while you're not home, you may lose access to your Immich instance when outside your home

The solution to this is a [dynamic DNS provider](https://en.wikipedia.org/wiki/Dynamic_DNS). DynDNS is a popular one (and often enjoys built-in integration with router software), but, for my purposes, I wanted to keep my Immich setup divorced from the availability of automated updates in my router of choice. Further, the whole point of this exercise is to get away from the centralization and consolidation of service offerings, so I opted for [No-IP](https://www.noip.com/) as my provider of choice.

Registration there is simple and free. Choose your preferred domain and remember it. It will try to ask you for an IP address; don't worry about what is set now (it chose my VPN address, amusingly) - we'll get it set to the correct one later. Even if it _is_ set to your home IP address, there's no security risk here since you've not let Internet traffic reach your Immich instance (yet).

##### Install nginx

Install nginx on your Raspberry Pi with this command:

```
sudo apt install nginx
```

This will install a barebones instance of nginx in your system. You can test that nginx is working by going to:

```
http://RASPBERRY_PI_IP_ADDRESS/
```

##### Setting up an SSL Certificate

The certbot utility makes this a breeze. You can install it and set up your certificate with nginx using the following commands:

```
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DNS
```

In this case, `YOUR_DNS` is the DNS name you set up with No-IP, above.

Once this is done, there will be a new SSL certificate setup in your `/etc/nginx/sites-available/default` file.

##### Finalize Reverse Proxy Configuration

There are still a few things that need to be added to your nginx configuration to make Immich accessible and usable on the Internet.

Within each `server` block, add the following:

```
location /api/socket.io/ {
        proxy_pass http://127.0.0.1:2283;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
        proxy_pass http://127.0.0.1:2283/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
}
```

This tells nginx to route any traffic on the respective port (80, or HTTP, and 443, or HTTPS) to your Immich instance. I recommend having it on both unencrypted and encrypted configurations to make it easier to test Immich within your network. We will _not_ be forwarding port 80 to your Immich instance, so the Internet will not have unencrypted access to your Immich instance.

In addition to the above, you will need to add this to your server definition:

```
client_max_body_size 100M;
```

Any uploads that exceed the default size of 1 MiB (pretty much any photo that isn't 640x480 in resolution or a video) will fail to upload through nginx, otherwise. 

You can set this value to whatever you need - figure out the optimal maximum size you want to let someone try to upload to your server.

Once you've made these changes, you can get them running in nginx with this command:

```
sudo systemctl reload nginx
```

##### Setting Up Automated DNS Updates

As I mentioned before, your home Internet's IP address can change without warning. No-IP provides installing that's pretty easy to install and setup to automate the update of your IP address.

From any arbitrary directory (I recommend one that you can, eventually, delete), run the following commands to download and decompress No-IP's source files for their automated update client:

```
wget https://www.noip.com/client/linux/noip-duc-linux.tar.gz
tar zxvf noip-duc-linux.tar.gz
```

`cd` into the directory it expanded into and then run:

```
sudo make
sudo make install
```

Follow the prompts it gives you to set up periodic updates of your IP address. You're all set! Your No-IP hostname that you set up previously should now, if it wasn't already, be pointed at your home's IP address.

##### Forward the Port on Your Router

At this point, you've got a human-readable address that tells the Internet where your home IP address is and you've got an nginx server that can serve an SSL certificate for that address to encrypt communications with Immich, but you need to let traffic that's arriving at your home IP address into your network and be routed to your nginx instance.

The final step for this will vary widely depending on who your router provider is, so I can't provide any detailed guides here, but the basic gist is that you should set up your router's port forwarding to forward port 443 to your Raspberry Pi's IP address.

Once that's done, you should be able to go to `https://YOUR_DNS/` and see Immich! Do a test upload of a photo to make sure everything works as desired.

As a final step, I suggest also installing the Immich app on your phone and making sure that everything uploads correctly from there, too - and try it, also, on your mobile data (if you can) to make sure that it truly does work from anywhere.