/* eslint-disable max-len */
import { SlashCommandBuilder } from '@discordjs/builders';
import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v9';
import { CacheType, ChannelType, Client, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Interaction, Role, TextBasedChannel } from 'discord.js';
import logger from '../../lib/logger';
import { Command } from '../common/command';
import { Widget } from '../common/widget';

const buttonIds = {
    toggle: 'toggle',
    voice: 'voice',
    reload: 'reload',
    info: 'info'
};

let widgets: Widget[] = [];

export class CommandCreate extends Command {
    public constructor(protected client: Client) {
        super('create', 'Creates a wartimer widget in the current channel', client);

        client.on('interactionCreate', interaction => {
            this.onInteraction(interaction);
        });
    }
    private async onInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isButton() || !interaction.channel) {
            return;
        }

        if (!interaction.guild) {
            await interaction.reply({ ephemeral: true, content: 'Unable to complete request' });
            return;
        }
        const [buttonId] = interaction.customId.split('-');
        const guild = interaction.guild;

        await interaction.message.fetch()
            // eslint-disable-next-line no-async-promise-executor
            .then((message) => new Promise<Widget>(async (res) => {
                // Check if widget entry exists for this widget, create if not
                const widget = widgets.find((widget) => widget.getId() === interaction.message.id);
                if (!widget) {
                    logger.log('Creating widget in memory');
                    await interaction.deferUpdate();
                    new Widget(message, guild, [], (widget) => {
                        widgets.push(widget);
                        res(widget);
                    }, (widget) => widgets = widgets.filter((w) => w.getId() !== widget.getId()));
                } else {
                    res(widget);
                }
            }))
            .then(async (widget) => {
                logger.log(buttonId + '-button pressed in ' + guild.name + ' by ' + interaction.user.username);
                switch (buttonId) {
                    case buttonIds.toggle:
                        await widget.toggle(interaction);
                        break;
                    case buttonIds.voice:
                        await widget.toggleVoice(interaction);
                        break;
                    case buttonIds.reload:
                        widget.recreateMessage(true);
                        break;
                    case buttonIds.info:
                        interaction.reply({
                            ephemeral: true,
                            embeds: [new EmbedBuilder()
                                .setTitle('Widget Info')
                                .setDescription('Button 1 - Starts / Stops Text Updates\n' +
                                    'Button 2 - Starts/Stops Audio Updates\n' +
                                    'Button 3 - Reloads the Widget\n' +
                                    'Button 4 - Sends Widget Info\n\n' +
                                    'Respawn Timer Data Source: https://respawntimer.com\n' +
                                    'If the text widget reloads too often increase the interval with /set delay')]
                        });
                        break;
                }
            })
            .catch(async () => {
                if(!interaction.deferred){
                    await interaction.reply({ ephemeral: true, content: 'Unable to fetch the message' });
                }
            });
    }
    public build(): RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addChannelOption((option) => option
                .setName('channel')
                .setDescription('The channel where the timer widget will be posted')
                .setRequired(false))
            .addRoleOption((option) => option
                .setName('managerrole')
                .setDescription('This role is allowed to manage the timer')
                .setRequired(false))
            .addRoleOption((option) => option
                .setName('managerrole2')
                .setDescription('This role is allowed to manage the timer')
                .setRequired(false))
            .addRoleOption((option) => option
                .setName('managerrole3')
                .setDescription('This role is allowed to manage the timer')
                .setRequired(false))
            .toJSON();
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    public async execute(interaction: CommandInteraction<CacheType> & { options: Pick<CommandInteractionOptionResolver<CacheType>, 'getRole' | 'getChannel'> }): Promise<void> {
        const roles = [
            interaction.options.getRole('managerrole'),
            interaction.options.getRole('managerrole2'),
            interaction.options.getRole('managerrole3')
        ].filter((role): role is Role => !!role);
        const channel = interaction.options.getChannel('channel') as TextBasedChannel | null ?? interaction.channel;
        const guild = interaction.guild;
        if (!guild) {
            await interaction.reply('This cannot be used in DMs');
            return;
        }
        if (!channel || channel.type !== ChannelType.GuildText) {
            await interaction.reply({ ephemeral: true, content: 'Invalid channel' });
            return;
        }
        await interaction.deferReply({ ephemeral: true });
        channel.send({
            embeds: [new EmbedBuilder().setTitle('Respawn Timer')]
        }).then((message) => {
            new Widget(message, guild, roles, async (widget) => {
                widgets.push(widget);
                await interaction.editReply({ content: 'Widget created.' });
            }, (widget) => widgets = widgets.filter((w) => w.getId() !== widget.getId()));
        });
    }
}
