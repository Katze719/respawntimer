import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ActivityType, Client, GatewayIntentBits, Message, PresenceUpdateStatus, User } from 'discord.js';
import logger from '../lib/logger';
import { Create } from './commands/create';
import { Settings } from './commands/settings';
import { Command } from './commands/command';
import { InteractionHandler } from './handlers/interactionHandler';
import { NotificationHandler } from './handlers/notificationHandler';
import { WidgetHandler } from './handlers/widgetHandler';
import { Invite } from './commands/invite';
import Database from './db/database';


/**
 * This class is used to register new Triggers with the bot
 * It is currently only capable of reacting to message triggers
 * TODO: Add additional triggers like [channelJoined, guildJoined, etc.]
 */
class Bot {
    public readonly user: User | null;
    public interactionHandler;
    public notificationHandler;
    public widgetHandler;
    private constructor(
        public client: Client,
        commands: Command[]
    ) {
        this.user = this.client.user;
        this.interactionHandler = new InteractionHandler(client);
        this.notificationHandler = new NotificationHandler(client);
        this.widgetHandler = new WidgetHandler(client);
        this.client.user?.setActivity({ name: 'New World', type: ActivityType.Playing });
        this.client.on('interactionCreate', (interaction) => {
            if (!interaction.isCommand() || !interaction.guild) return;
            Database.getGuild(interaction.guild).then((dbGuild) => {
                return commands.find((command) => command.name === interaction.commandName)?.execute(interaction, dbGuild);
            }).catch(logger.error)
        });
    }

    public static async init(): Promise<Bot> {
        return new Promise((resolve, reject) => {
            const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });
            const token = process.env['DISCORD_CLIENT_TOKEN'];
            const clientId = process.env['DISCORD_CLIENT_ID'];
            const commands = [
                new Create(client),
                new Settings(client),
                new Invite(client),
            ];

            if (!token) {
                throw new Error('Environment variable "DISCORD_CLIENT_TOKEN" not found!');
            }
            if (!clientId) {
                throw new Error('Environment variable "DISCORD_CLIENT_ID" not found!');
            }

            client.on('error', (e) => {
                logger.error(e);
            });

            client.once('ready', () => {
                logger.info('Client ready!');
                // Register Commands once client is ready
                const rest = new REST({ version: '10' }).setToken(token);
                rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands.map((command) => command.build()) }
                )
                    .then(() => logger.info('Commands Registered: ' + commands.map((command) => '/' + command.name).join(', ')))
                    .catch(logger.error);
            });

            client.login(token)
                .then(() => new Bot(client, commands))
                .then(resolve)
                .catch(reject);
        });
    }
}
export default Bot;