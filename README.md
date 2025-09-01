# Matrix Bridges - Umbrel Community App Store

This repository provides Matrix bridge applications for Umbrel, allowing you to connect your Matrix/Synapse server with various messaging platforms.

## 🚀 Quick Start for Users

1. Fork this repository to your GitHub account
2. Wait for GitHub Actions to build the Docker images (check the Actions tab)
3. Add your forked repository to Umbrel: `https://github.com/YOUR_USERNAME/umbrel-community-app-store`
4. Install the bridges from your Umbrel dashboard

## Available Bridges

### Telegram Bridge
Connect your Matrix server with Telegram to:
- Send and receive messages between Matrix and Telegram
- Bridge group chats and channels
- Share media, files, and stickers
- Use your Matrix account to communicate with Telegram users

## Installation

### Adding the App Store to Umbrel

1. Open your Umbrel dashboard
2. Navigate to the App Store settings
3. Add your forked repository URL: `https://github.com/YOUR_USERNAME/umbrel-community-app-store`
4. The "Matrix Bridges" app store will appear in your list

### Setting up the Telegram Bridge

1. **Install the Telegram Bridge app** from the Matrix Bridges store
2. **Open the configuration UI** by clicking on the app
3. **Get your Telegram API credentials:**
   - Visit [my.telegram.org](https://my.telegram.org)
   - Sign in with your phone number
   - Click "API Development Tools"
   - Create a new application
   - Copy the `api_id` and `api_hash`
4. **Configure the bridge:**
   - Enter your Telegram API credentials
   - Add your Matrix user ID as an admin (e.g., `@yourname:umbrel.local`)
   - Save the configuration
5. **Start using the bridge:**
   - In your Matrix client (Element), start a chat with `@telegrambot:umbrel.local`
   - Send `help` to see available commands
   - Use `login` to connect your Telegram account

## Bridge Architecture

Each bridge consists of:
- **Bridge Service**: The actual bridge application (e.g., mautrix-telegram)
- **Configuration UI**: A web interface for easy setup without CLI access
- **Persistent Storage**: Configurations and data stored in Docker volumes

## Development

### Adding a New Bridge

To add a new bridge to this repository:

1. Create a new directory: `matrix-bridges-[platform]`
2. Add required files:
   - `umbrel-app.yml` - App metadata
   - `docker-compose.yml` - Service definitions
   - `config-ui/` - Configuration UI application

### Structure Example
```
matrix-bridges-telegram/
├── umbrel-app.yml
├── docker-compose.yml
└── config-ui/
    ├── Dockerfile
    ├── package.json
    ├── server.js
    └── public/
        └── index.html
```

## Configuration UI Features

Each bridge includes a custom web UI that provides:
- Easy credential input forms
- Status monitoring (config, registration, bridge status)
- Automatic configuration file generation
- Matrix homeserver integration
- User permission management

## Requirements

- Umbrel with Synapse (Matrix server) installed
- API credentials for the messaging platform you want to bridge
- Basic understanding of Matrix user IDs and domains

## Support

For bridge-specific support:
- **Telegram Bridge**: [#telegram:maunium.net](https://matrix.to/#/#telegram:maunium.net)
- **General Matrix Help**: [#matrix:matrix.org](https://matrix.to/#/#matrix:matrix.org)

## 🔧 GitHub Actions Setup

This repository uses GitHub Actions to automatically build and publish Docker images to GitHub Container Registry.

### Image Mirroring for Performance

**Why we mirror:** The upstream `dock.mau.dev` registry is very slow, causing Umbrel installations to hang or timeout. We mirror these images to GitHub Container Registry for 10x faster downloads.

**Mirrored images:**
- `dock.mau.dev/mautrix/telegram` → `ghcr.io/posix4e/mautrix-telegram`
- Daily automatic updates via GitHub Actions
- Reduces installation time from 10+ minutes to under 1 minute

### Automatic Build Process

1. **On Fork**: GitHub Actions are automatically enabled
2. **On Push**: Images are built for multiple architectures (amd64, arm64, armv7)
3. **Daily Mirror**: Upstream images are pulled and re-pushed to ghcr.io
4. **Image Locations**: 
   - Config UI: `ghcr.io/YOUR_USERNAME/telegram-bridge-config-ui:latest`
   - Mautrix Mirror: `ghcr.io/YOUR_USERNAME/mautrix-telegram:v0.15.1`

### Customizing for Your Fork

After forking, the docker-compose.yml will automatically use your GitHub username for the image. If you need to customize:

1. Edit `matrix-bridges-telegram/docker-compose.yml`
2. Replace `posix4e` with your GitHub username in the image line
3. Push changes to trigger a new build

### Build Status

Check your build status at: `https://github.com/YOUR_USERNAME/umbrel-community-app-store/actions`

## Contributing

Contributions are welcome! To add a new bridge:
1. Fork this repository
2. Create a new bridge following the structure above
3. Add a new build job in `.github/workflows/docker-build.yml`
4. Test the bridge with Umbrel
5. Submit a pull request

## License

This repository is a template for Matrix bridge applications. Individual bridges may have their own licenses:
- mautrix-telegram: [AGPL-3.0](https://github.com/mautrix/telegram/blob/master/LICENSE)
- Configuration UI: MIT

## Credits

- [mautrix](https://github.com/mautrix) for the excellent bridge implementations
- [Umbrel](https://umbrel.com) for the self-hosting platform
- Matrix community for the decentralized communication protocol