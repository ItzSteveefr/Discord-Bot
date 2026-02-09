const { Events, Collection } = require('discord.js');
const inviteDb = require('../database/inviteDb');

// Cache to store invites for each guild
const invitesCache = new Collection();

/**
 * Load all invites for a guild into cache
 */
async function loadInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        const codeUses = new Collection();
        invites.each(inv => codeUses.set(inv.code, inv.uses));
        invitesCache.set(guild.id, codeUses);
    } catch (err) {
        console.error(`Failed to load invites for guild ${guild.id}:`, err);
    }
}

function registerInviteHandler(client) {
    // 1. Load invites on ready
    client.once(Events.ClientReady, async () => {
        console.log('📨 Loading invite cache...');
        for (const [id, guild] of client.guilds.cache) {
            await loadInvites(guild);
        }
        console.log('✅ Invite cache loaded');
    });

    // 2. Load invites when bot joins a guild
    client.on(Events.GuildCreate, async guild => {
        await loadInvites(guild);
    });

    // 3. Track new invites
    client.on(Events.InviteCreate, async invite => {
        const guildInvites = invitesCache.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.set(invite.code, invite.uses);
        }
    });

    // 4. Track deleted invites
    client.on(Events.InviteDelete, async invite => {
        const guildInvites = invitesCache.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    });

    // 5. Track Member Join (The Logic)
    client.on(Events.GuildMemberAdd, async member => {
        const guildId = member.guild.id;
        const cachedInvites = invitesCache.get(guildId);

        // If cache missing, try to load it (fallback)
        if (!cachedInvites) return loadInvites(member.guild);

        try {
            // Fetch current invites from API
            const currentInvites = await member.guild.invites.fetch();

            // Find the invite that incremented
            const usedInvite = currentInvites.find(inv => {
                const cachedUses = cachedInvites.get(inv.code) || 0;
                return inv.uses > cachedUses;
            });

            // Update cache
            currentInvites.each(inv => cachedInvites.set(inv.code, inv.uses));
            invitesCache.set(guildId, cachedInvites);

            if (!usedInvite) {
                // Could be vanity URL or unknown
                console.log(`Member ${member.user.tag} joined via unknown invite/vanity.`);
                return;
            }

            const inviterId = usedInvite.inviter.id;

            // Ignore self-invites or bot invites if desired, but usually we track them and label them "fake" or distinct?
            // User requested standard tracking.

            // Fetch existing data
            let inviterData = inviteDb.getUserInvites(guildId, inviterId);
            if (!inviterData) {
                inviterData = { total: 0, regular: 0, left: 0, fake: 0, bonus: 0, invited: [] };
            }

            // Determine invite type
            const isFake = (Date.now() - member.user.createdTimestamp) < (1000 * 60 * 60 * 24 * 3); // < 3 days old account = Fake? Or self-invite?
            // Common fake check: account age or previously joined.
            // For now, let's just count as regular unless simple check fails.

            // Self invite check?
            if (inviterId === member.id) {
                inviterData.fake++;
            } else if (isFake) {
                inviterData.fake++;
            } else {
                inviterData.regular++;
            }

            inviterData.total++;

            // Add to history
            if (!inviterData.invited) inviterData.invited = [];
            inviterData.invited.push({
                userId: member.id,
                ts: Date.now()
            });

            // Update DB
            inviteDb.updateUserInvites(guildId, inviterId, inviterData);
            console.log(`✅ Tracked invite: ${member.user.tag} invited by ${usedInvite.inviter.tag}`);

            // Store who invited this member for "Leave" tracking
            // (We need a way to look up inviter by memberId later. 
            // inviteDb stores BY INVITER. We need a separate map or iterate.)
            // Or we just rely on iterating all users in DB to find who invited them? That's slow.
            // We should store "inviter" in the member's data if possible, or a "reverse lookup" DB.
            // For simplicity/speed, I'll add a helper to inviteDb to store the mapping: memberId -> inviterId.
            // Wait, inviteDb doesn't have that. 

            // Let's create a "memberInvites.json" or similar?
            // Or just add a method to inviteDb to save this mapping if it supports it.
            // The JSON structure is currently: { guildId: { userId: { ...stats } } }.
            // I should add a "inviters" key to guild data? { guildId: { users: {}, members: { memberId: inviterId } } } ?
            // I'll stick to the current structure and maybe add a "invitedBy" file? 
            // Or I can add a method to inviteDb to handle this.

            // I'll add `saveMemberInviter(guildId, memberId, inviterId)` to inviteDb.js later.
            // For now, I'll define it but I need to update inviteDb.js first to support it.
            inviteDb.saveMemberInviter(guildId, member.id, inviterId);

        } catch (err) {
            console.error('Invite tracking error:', err);
        }
    });

    // 6. Track Member Leave
    client.on(Events.GuildMemberRemove, async member => {
        const guildId = member.guild.id;

        // Find who invited this member
        const inviterId = inviteDb.getInviterOf(guildId, member.id);
        if (!inviterId) return;

        let inviterData = inviteDb.getUserInvites(guildId, inviterId);
        if (inviterData) {
            // Decrement regular, increment left
            if (inviterData.regular > 0) inviterData.regular--;
            inviterData.left++;
            // Total usually stays same or decreases? 
            // Usually: Total = Regular + Bonus - Fake? No, Total often means "current valid invites".
            // Or "All time".
            // Ares reference: total = regular + bonus - left?
            // "Total Invites" usually display (regular + bonus).
            // Let's look at Ares code: `const total = inviteData.total || 0;` it's stored.
            // If someone leaves, does total go down?
            // Typically yes. 
            if (inviterData.total > 0) inviterData.total--;

            inviteDb.updateUserInvites(guildId, inviterId, inviterData);
            console.log(`👋 Member left. Updated stats for inviter ${inviterId}`);
        }
    });
}

module.exports = registerInviteHandler;
