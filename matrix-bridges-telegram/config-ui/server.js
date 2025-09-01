const express = require('express');
const bodyParser = require('body-parser');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BRIDGE_DATA_PATH = process.env.BRIDGE_DATA_PATH || '/data/bridge';
const CONFIG_PATH = path.join(BRIDGE_DATA_PATH, 'config.yaml');
const REGISTRATION_PATH = path.join(BRIDGE_DATA_PATH, 'registration.yaml');
const SYNAPSE_DATA_PATH = process.env.SYNAPSE_DATA_PATH || '/synapse-data';

app.use(bodyParser.json());
app.use(express.static('public'));

// Ensure data directory exists with proper permissions
fs.ensureDirSync(BRIDGE_DATA_PATH, { recursive: true, mode: 0o777 });

function generateToken() {
  return [...Array(64)].map(() => Math.random().toString(36)[2]).join('');
}

// Step 1: Generate config and registration files
app.post('/api/setup/step1', async (req, res) => {
  try {
    const { matrixUser } = req.body;
    
    if (!matrixUser) {
      return res.status(400).json({ error: 'Matrix user ID required' });
    }
    
    const domain = process.env.SYNAPSE_DOMAIN || 'umbrel.local';
    const fullUser = matrixUser.includes(':') ? matrixUser : `@${matrixUser}:${domain}`;
    
    // Generate tokens
    const asToken = generateToken();
    const hsToken = generateToken();
    
    // Create config
    const config = {
      homeserver: {
        address: process.env.SYNAPSE_URL || 'http://synapse_server_1:8008',
        domain: domain,
        verify_ssl: false,
        http_retry_count: 4,
        status_endpoint: null,
        message_send_checkpoint_endpoint: null,
        async_media: false
      },
      appservice: {
        address: 'http://matrix-bridges-telegram_mautrix-telegram_1:29317',
        hostname: '0.0.0.0',
        port: 29317,
        max_body_size: 1,
        database: 'sqlite:////data/mautrix-telegram.db',
        id: 'telegram',
        bot_username: 'telegrambot',
        bot_displayname: 'Telegram bridge bot',
        bot_avatar: 'mxc://maunium.net/tJCRmUyJDsgRNgqhOgoiHWbX',
        as_token: asToken,
        hs_token: hsToken
      },
      bridge: {
        username_template: 'telegram_{userid}',
        alias_template: 'telegram_{groupid}',
        displayname_template: '{displayname} (Telegram)',
        displayname_preference: ['full_name', 'username', 'phone_number'],
        displayname_max_length: 100,
        allow_avatar_remove: true,
        allow_contact_info: true,
        sync_channel_members: true,
        startup_sync: true,
        sync_create_limit: 15,
        sync_direct_chats: false,
        telegram_link_preview: true,
        invite_link_resolve: false,
        encryption: {
          allow: false,
          default: false,
          database: 'default',
          verification_levels: {
            receive: 'unverified',
            send: 'unverified',
            share: 'cross-signed-tofu'
          },
          require: false
        },
        private_chat_portal_meta: false,
        parallel_file_transfer: false,
        exit_on_update_error: false,
        bridge_matrix_leave: true,
        delivery_receipts: false,
        delivery_error_reports: false,
        federate_rooms: true,
        animated_sticker: {
          target: 'webp',
          convert_from_webm: false
        },
        animated_emoji: {
          target: 'disable'
        },
        double_puppet_server_map: {},
        double_puppet_allow_discovery: false,
        login_shared_secret_map: {},
        telegram_avatar_initial_sync: true,
        telegram_profile_name_initial_sync: true,
        allow_matrix_login: true,
        public_portals: false,
        sync_direct_chat_list: false,
        relaybot: {
          enabled: false
        },
        authless_portals: true,
        message_status_events: false,
        restricted_rooms: true,
        send_stickers_without_preview: false,
        filter: {
          mode: 'whitelist',
          list: []
        },
        permissions: {
          [fullUser]: 'admin',
          [domain]: 'user'
        }
      },
      telegram: {
        api_id: 0,
        api_hash: '',
        bot_token: '',
        catch_up: true,
        sequential_updates: true,
        exit_on_update_error: false,
        device_info: {
          device_model: 'mautrix-telegram',
          system_version: 'auto',
          app_version: 'auto'
        },
        server: {
          enabled: false,
          dc: 2,
          ip: '149.154.167.50',
          port: 443
        }
      },
      logging: {
        version: 1,
        formatters: {
          colored: {
            '()': 'mautrix_telegram.util.ColorFormatter',
            format: '[%(asctime)s] [%(levelname)s@%(name)s] %(message)s'
          }
        },
        handlers: {
          console: {
            class: 'logging.StreamHandler',
            formatter: 'colored'
          }
        },
        loggers: {
          mau: {
            level: 'DEBUG'
          },
          telethon: {
            level: 'INFO'
          },
          aiohttp: {
            level: 'INFO'
          }
        },
        root: {
          level: 'DEBUG',
          handlers: ['console']
        }
      }
    };
    
    // Create registration
    const registration = {
      id: 'telegram',
      as_token: asToken,
      hs_token: hsToken,
      namespaces: {
        users: [
          {
            exclusive: true,
            regex: `@telegram_.*:${domain}`
          },
          {
            exclusive: true,
            regex: `@telegrambot:${domain}`
          }
        ],
        aliases: [
          {
            exclusive: true,
            regex: `#telegram_.*:${domain}`
          }
        ]
      },
      url: 'http://matrix-bridges-telegram_mautrix-telegram_1:29317',
      sender_localpart: 'telegrambot',
      rate_limited: false
    };
    
    // Write files
    await fs.writeFile(CONFIG_PATH, yaml.dump(config), { encoding: 'utf8', mode: 0o666 });
    await fs.writeFile(REGISTRATION_PATH, yaml.dump(registration), { encoding: 'utf8', mode: 0o666 });
    
    res.json({
      success: true,
      message: 'Configuration files created',
      botUsername: `@telegrambot:${domain}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 2: Copy registration to Synapse
app.post('/api/setup/step2', async (req, res) => {
  try {
    const synapseConfigPath = path.join(SYNAPSE_DATA_PATH, 'homeserver.yaml');
    const targetRegPath = path.join(SYNAPSE_DATA_PATH, 'telegram-registration.yaml');
    
    // Check if we can access Synapse data
    if (!await fs.pathExists(SYNAPSE_DATA_PATH)) {
      return res.json({
        success: false,
        message: 'Cannot access Synapse data directory. You need to manually copy the registration file.',
        registrationPath: REGISTRATION_PATH
      });
    }
    
    // Copy registration file
    await fs.copy(REGISTRATION_PATH, targetRegPath);
    
    res.json({
      success: true,
      message: 'Registration file copied to Synapse data directory'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Step 3: Update Synapse config
app.post('/api/setup/step3', async (req, res) => {
  try {
    const synapseConfigPath = path.join(SYNAPSE_DATA_PATH, 'homeserver.yaml');
    
    if (!await fs.pathExists(synapseConfigPath)) {
      return res.json({
        success: false,
        message: 'Cannot access Synapse config. You need to manually add the registration to homeserver.yaml'
      });
    }
    
    let synapseConfig = await fs.readFile(synapseConfigPath, 'utf8');
    
    // Check if already registered
    if (synapseConfig.includes('telegram-registration.yaml')) {
      return res.json({
        success: true,
        message: 'Bridge already registered in Synapse config'
      });
    }
    
    // Add registration
    if (synapseConfig.includes('app_service_config_files:')) {
      // Find the app_service_config_files section and add our registration
      const lines = synapseConfig.split('\n');
      const index = lines.findIndex(line => line.includes('app_service_config_files:'));
      if (index !== -1) {
        lines.splice(index + 1, 0, '  - /data/telegram-registration.yaml');
        synapseConfig = lines.join('\n');
      }
    } else {
      // Add new section
      synapseConfig += '\n\napp_service_config_files:\n  - /data/telegram-registration.yaml\n';
    }
    
    await fs.writeFile(synapseConfigPath, synapseConfig, 'utf8');
    
    res.json({
      success: true,
      message: 'Synapse config updated. Restart Synapse to apply changes.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check status
app.get('/api/status', async (req, res) => {
  try {
    const configExists = await fs.pathExists(CONFIG_PATH);
    const registrationExists = await fs.pathExists(REGISTRATION_PATH);
    
    let synapseAccessible = false;
    let registrationInSynapse = false;
    
    const synapseConfigPath = path.join(SYNAPSE_DATA_PATH, 'homeserver.yaml');
    if (await fs.pathExists(synapseConfigPath)) {
      synapseAccessible = true;
      const synapseConfig = await fs.readFile(synapseConfigPath, 'utf8');
      registrationInSynapse = synapseConfig.includes('telegram-registration.yaml');
    }
    
    res.json({
      configExists,
      registrationExists,
      synapseAccessible,
      registrationInSynapse
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Config UI running on port ${PORT}`);
});