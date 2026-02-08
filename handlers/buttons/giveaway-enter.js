const {
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    MessageFlags,
    ContainerBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder
} = require('discord.js');
const giveawayDb = require('../../database/giveawayDb');

const SAFE_MENTIONS = { parse: [] };
const getFooterText = () => `**UnderFive Studios** | <t:${Math.floor(Date.now() / 1000)}:R>`;

// ============== UTILITY FUNCTIONS ==============

function formatTimestamp(ms) {
    return `<t:${Math.floor(ms / 1000)}:R>`;
}

function formatFullTimestamp(ms) {
    return `<t:${Math.floor(ms / 1000)}:F>`;
}

function buildGiveawayContainer(giveaway, ended = false) {
    giveaway.entries = giveaway.entries || [];
    giveaway.winners = giveaway.winners || [];
    giveaway.giveawayId = giveaway.giveawayId || giveaway.messageId;

    const container = new ContainerBuilder();
    if (giveaway.color) {
        container.setAccentColor(giveaway.color);
    }

    const titleEmoji = '🎉';
    container.addTextDisplayComponents(td => td.setContent(`# ${titleEmoji} ${giveaway.prize}`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    if (giveaway.description) {
        container.addTextDisplayComponents(td => td.setContent(giveaway.description));
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    }

    const arrow = '➡️';
    let infoText = '';

    if (ended) {
        const winners = giveaway.winners?.length > 0
            ? giveaway.winners.map(id => `<@${id}>`).join(', ')
            : 'No valid winners';
        infoText = `${arrow} **Winners:** ${winners}\n`;
        infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
        infoText += `${arrow} **Ended:** ${formatFullTimestamp(giveaway.endTime)}`;
    } else {
        infoText = `${arrow} **Ends:** ${formatTimestamp(giveaway.endTime)}\n`;
        infoText += `${arrow} **Winners:** ${giveaway.winnerCount}\n`;
        if (giveaway.winnerRoles?.length > 0) {
            infoText += `${arrow} **Prize Roles:** ${giveaway.winnerRoles.map(r => `<@&${r}>`).join(', ')}\n`;
        }
        infoText += `${arrow} **Entries:** ${giveaway.entries?.length || 0}\n`;
        infoText += `${arrow} **Hosted by:** <@${giveaway.hostId}>`;
    }

    if (giveaway.thumbnail) {
        container.addSectionComponents(section => {
            section.addTextDisplayComponents(td => td.setContent(infoText));
            section.setThumbnailAccessory(thumb => thumb.setURL(giveaway.thumbnail));
            return section;
        });
    } else {
        container.addTextDisplayComponents(td => td.setContent(infoText));
    }

    // Requirements section
    const requirements = [];
    if (giveaway.requiredRoles?.length > 0) {
        requirements.push(`**Required Roles:** ${giveaway.requiredRoles.map(r => `<@&${r}>`).join(', ')}`);
    }
    if (giveaway.minLevel > 0) {
        requirements.push(`**Min Level:** ${giveaway.minLevel}`);
    }
    if (giveaway.maxLevel > 0) {
        requirements.push(`**Max Level:** ${giveaway.maxLevel}`);
    }
    if (giveaway.minAge > 0) {
        requirements.push(`**Min Account Age:** ${giveaway.minAge} days`);
    }
    if (giveaway.minStay > 0) {
        requirements.push(`**Min Server Stay:** ${giveaway.minStay} days`);
    }

    if (requirements.length > 0) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(td => td.setContent(`### Requirements\n${requirements.join('\n')}`));
    }

    // Image gallery
    if (giveaway.image) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        const gallery = new MediaGalleryBuilder().addItems(item => item.setURL(giveaway.image));
        container.addMediaGalleryComponents(gallery);
    }

    // Buttons (only for active giveaways)
    if (!ended) {
        container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

        const joinRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`giveaway_join:${giveaway.giveawayId}`)
                .setEmoji('🎉')
                .setLabel(`Enter (${giveaway.entries?.length || 0})`)
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`giveaway_view:${giveaway.giveawayId}`)
                .setEmoji('👥')
                .setLabel('View Participants')
                .setStyle(ButtonStyle.Secondary)
        );
        container.addActionRowComponents(joinRow);
    }

    // Footer
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(td => td.setContent(`-# ${getFooterText()}`));

    return container;
}

// ============== REQUIREMENT CHECKING ==============

async function checkRequirements(member, giveaway) {
    const errors = [];

    if (giveaway.requiredRoles?.length > 0) {
        const hasRole = giveaway.requiredRoles.some(roleId => member.roles.cache.has(roleId));
        if (!hasRole) {
            errors.push('You need one of the required roles to enter.');
        }
    }

    // Level check (placeholder - no leveling system)
    if (giveaway.minLevel > 0 || giveaway.maxLevel > 0) {
        const userLevel = 0;
        if (giveaway.minLevel > 0 && userLevel < giveaway.minLevel) {
            errors.push(`You need to be at least level ${giveaway.minLevel} to enter.`);
        }
        if (giveaway.maxLevel > 0 && userLevel > giveaway.maxLevel) {
            errors.push(`You cannot be higher than level ${giveaway.maxLevel} to enter.`);
        }
    }

    if (giveaway.minAge > 0) {
        const accountAge = (Date.now() - member.user.createdTimestamp) / 86400000;
        if (accountAge < giveaway.minAge) {
            errors.push(`Your account must be at least ${giveaway.minAge} days old.`);
        }
    }

    if (giveaway.minStay > 0) {
        const stayDays = (Date.now() - member.joinedTimestamp) / 86400000;
        if (stayDays < giveaway.minStay) {
            errors.push(`You must be in the server for at least ${giveaway.minStay} days.`);
        }
    }

    return errors;
}

// ============== BUTTON HANDLER ==============

module.exports = {
    customId: 'giveaway_join',

    match(customId) {
        return customId.startsWith('giveaway_join:');
    },

    async execute(interaction) {
        try {
            const [, giveawayId] = interaction.customId.match(/^giveaway_join:([\w_-]+)$/) || [];

            if (!giveawayId) {
                return interaction.reply({
                    content: `❌ Invalid giveaway button.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const giveaway = giveawayDb.getGiveawayById(interaction.guildId, giveawayId);

            if (!giveaway) {
                return interaction.reply({
                    content: `❌ Giveaway not found.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (giveaway.ended) {
                return interaction.reply({
                    content: `❌ This giveaway has ended.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            giveaway.entries = giveaway.entries || [];

            // Check requirements
            const errors = await checkRequirements(interaction.member, giveaway);
            if (errors.length > 0) {
                return interaction.reply({
                    content: `❌ ${errors.join('\n')}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Toggle entry
            const { giveaway: updatedGiveaway, action } = giveawayDb.toggleEntry(
                interaction.guildId,
                giveawayId,
                interaction.user.id
            );

            if (!updatedGiveaway) {
                return interaction.reply({
                    content: `❌ Failed to update giveaway.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Update the message with Components v2
            const container = buildGiveawayContainer(updatedGiveaway);

            await interaction.update({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: SAFE_MENTIONS
            }).catch(() => { });

            // Send confirmation as followUp
            if (action === 'joined') {
                await interaction.followUp({
                    content: `✅ You entered the giveaway! Good luck! 🍀`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            } else {
                await interaction.followUp({
                    content: `✅ You left the giveaway.`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }

        } catch (err) {
            console.error('[giveaway_join] failed:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Something went wrong. Please try again.`,
                    flags: MessageFlags.Ephemeral
                }).catch(() => { });
            }
        }
    }
};
