/**
 * Components v2 Embed Builder Utilities
 * Pre-built templates for consistent styling across the bot
 */

const {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');

const { BRAND_COLORS, BOT_SETTINGS } = require('./config');

/**
 * Create a standard success message container
 * @param {string} title - The title of the message
 * @param {string} description - The description
 * @returns {Object} Components v2 message object
 */
const createSuccessMessage = (title, description) => {
    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.secondary)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ✅ ${title}`),
            new TextDisplayBuilder().setContent(description)
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create a standard error message container
 * @param {string} title - The title of the error
 * @param {string} description - The error description
 * @returns {Object} Components v2 message object
 */
const createErrorMessage = (title, description) => {
    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.error)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ❌ ${title}`),
            new TextDisplayBuilder().setContent(description)
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create a warning message container
 * @param {string} title - The title of the warning
 * @param {string} description - The warning description
 * @returns {Object} Components v2 message object
 */
const createWarningMessage = (title, description) => {
    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.accent)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ⚠️ ${title}`),
            new TextDisplayBuilder().setContent(description)
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create an info message container
 * @param {string} title - The title
 * @param {string} description - The description
 * @returns {Object} Components v2 message object
 */
const createInfoMessage = (title, description) => {
    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.info)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ℹ️ ${title}`),
            new TextDisplayBuilder().setContent(description)
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create a section with thumbnail accessory
 * @param {string} title - Section title
 * @param {string} description - Section description
 * @param {string} thumbnailUrl - URL for the thumbnail
 * @param {string} thumbnailAlt - Alt text for thumbnail
 * @param {number} color - Accent color
 * @returns {ContainerBuilder} Container with section
 */
const createSectionWithThumbnail = (title, description, thumbnailUrl, thumbnailAlt, color = BRAND_COLORS.primary) => {
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${title}`),
            new TextDisplayBuilder().setContent(description)
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder()
                .setURL(thumbnailUrl)
                .setDescription(thumbnailAlt || title)
        );

    const container = new ContainerBuilder()
        .setAccentColor(color)
        .addSectionComponents(section);

    return container;
};

/**
 * Create a confirmation dialog with buttons
 * @param {string} title - Dialog title
 * @param {string} description - Dialog description
 * @param {string} confirmId - Custom ID for confirm button
 * @param {string} cancelId - Custom ID for cancel button
 * @param {number} color - Accent color
 * @returns {Object} Components v2 message object with buttons
 */
const createConfirmationDialog = (title, description, confirmId, cancelId, color = BRAND_COLORS.accent) => {
    const container = new ContainerBuilder()
        .setAccentColor(color)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ⚠️ ${title}`),
            new TextDisplayBuilder().setContent(description)
        );

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(confirmId)
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(cancelId)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );

    return {
        components: [container, actionRow],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create a loading message
 * @param {string} message - Loading message text
 * @returns {Object} Components v2 message object
 */
const createLoadingMessage = (message = 'Please wait...') => {
    const container = new ContainerBuilder()
        .setAccentColor(BRAND_COLORS.info)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ⏳ Loading`),
            new TextDisplayBuilder().setContent(message)
        );

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
};

/**
 * Create a separator component
 * @param {string} spacing - Spacing size ('small', 'medium', 'large')
 * @returns {SeparatorBuilder} Separator component
 */
const createSeparator = (spacing = 'small') => {
    const spacingMap = {
        small: SeparatorSpacingSize.Small,
        medium: SeparatorSpacingSize.Large,  // No Medium in enum, use Large as fallback
        large: SeparatorSpacingSize.Large
    };

    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(spacingMap[spacing] || SeparatorSpacingSize.Small);
};

/**
 * Create a media gallery with images
 * @param {Array<{url: string, description: string}>} images - Array of image objects
 * @returns {MediaGalleryBuilder} Media gallery component
 */
const createMediaGallery = (images) => {
    const gallery = new MediaGalleryBuilder();

    images.forEach(img => {
        gallery.addItems(
            new MediaGalleryItemBuilder()
                .setURL(img.url)
                .setDescription(img.description || '')
        );
    });

    return gallery;
};

/**
 * Create a simple text display
 * @param {string} content - Text content (supports markdown)
 * @returns {TextDisplayBuilder} Text display component
 */
const createTextDisplay = (content) => {
    return new TextDisplayBuilder().setContent(content);
};

module.exports = {
    createSuccessMessage,
    createErrorMessage,
    createWarningMessage,
    createInfoMessage,
    createSectionWithThumbnail,
    createConfirmationDialog,
    createLoadingMessage,
    createSeparator,
    createMediaGallery,
    createTextDisplay,
    // Re-export constants for convenience
    BRAND_COLORS,
    BOT_SETTINGS,
    MessageFlags,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorSpacingSize
};
