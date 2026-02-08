const fs = require('fs');
const path = require('path');

const buttonHandlers = new Map();
const buttonModules = []; // Store button modules with match() functions
const buttonPath = path.join(__dirname, 'buttons');

// Load button files
function loadButtons() {
    if (!fs.existsSync(buttonPath)) {
        fs.mkdirSync(buttonPath, { recursive: true });
        console.log('📁 Buttons folder created.');
        return;
    }

    const buttonFiles = fs.readdirSync(buttonPath).filter(file => file.endsWith('.js'));

    for (const file of buttonFiles) {
        try {
            const filePath = path.join(buttonPath, file);
            // Clear cache (for hot-reload)
            delete require.cache[require.resolve(filePath)];

            const button = require(filePath);

            if (button.customId && typeof button.execute === 'function') {
                // Support multiple customIds
                const customIds = Array.isArray(button.customId) ? button.customId : [button.customId];

                for (const id of customIds) {
                    buttonHandlers.set(id, button.execute);
                }

                // Store modules with match() function for dynamic pattern matching
                if (button.match && typeof button.match === 'function') {
                    buttonModules.push(button);
                }

                console.log(`✅ Button loaded: ${file} (${customIds.join(', ')})`);
            } else {
                console.warn(`⚠️ Invalid button file: ${file}`);
            }
        } catch (err) {
            console.error(`❌ Button load error (${file}):`, err.message);
        }
    }

    console.log(`📦 ${buttonHandlers.size} button handlers loaded.`);
}



// Button handler
async function handleButton(interaction) {
    const { customId } = interaction;

    // Find handler matching prefix (star_1, star_2 etc.)
    let handler = buttonHandlers.get(customId);


    // Check for dynamic pattern matching via match() function
    if (!handler) {
        for (const mod of buttonModules) {
            if (mod.match && typeof mod.match === 'function' && mod.match(customId)) {
                handler = mod.execute;
                break;
            }
        }
    }

    // Prefix check (those starting with star_)
    if (!handler) {
        for (const [key, value] of buttonHandlers) {
            if (customId.startsWith(key.replace('*', ''))) {
                handler = value;
                break;
            }
        }
    }

    if (!handler) {
        console.warn(`⚠️ Unknown button: ${customId}`);
        await interaction.reply({
            content: '❌ No handler found for this button!',
            flags: 64
        });
        return;
    }

    try {
        await handler(interaction);
    } catch (error) {
        console.error(`❌ Button error (${customId}):`, error);

        const errorMessage = {
            content: '❌ An error occurred while processing this button!',
            flags: 64
        };

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(errorMessage);
        } else {
            await interaction.followUp(errorMessage);
        }
    }
}

// Select menu handler
async function handleSelectMenu(interaction) {
    const { customId } = interaction;

    const handler = buttonHandlers.get(customId);

    if (!handler) {
        console.warn(`⚠️ Unknown select menu: ${customId}`);
        await interaction.reply({
            content: '❌ No handler found for this menu!',
            flags: 64
        });
        return;
    }

    try {
        await handler(interaction);
    } catch (error) {
        console.error(`❌ Select menu error (${customId}):`, error);

        const errorMessage = {
            content: '❌ An error occurred while processing this menu!',
            flags: 64
        };

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(errorMessage);
        } else {
            await interaction.followUp(errorMessage);
        }
    }
}

// Initial load
loadButtons();

module.exports = {
    handleButton,
    handleSelectMenu,
    loadButtons
};
