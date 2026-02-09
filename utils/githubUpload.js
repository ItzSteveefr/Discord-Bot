const config = require('../config.json');

/**
 * Upload a file to GitHub repository
 * @param {string} filename - Name of the file to create
 * @param {string|Buffer} content - File content (string or Buffer)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
async function uploadToGitHub(filename, content) {
    const github = config.github;

    if (!github || !github.token || !github.owner || !github.repo) {
        console.error('GitHub configuration missing in config.json');
        return { success: false, error: 'GitHub not configured' };
    }

    try {
        // Convert Buffer to base64 if needed
        const base64Content = Buffer.isBuffer(content)
            ? content.toString('base64')
            : Buffer.from(content).toString('base64');

        const filePath = github.transcriptsPath
            ? `${github.transcriptsPath}/${filename}`
            : filename;

        const apiUrl = `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${filePath}`;

        // Check if file already exists (to get SHA for update)
        let existingSha = null;
        try {
            const checkResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${github.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Discord-Ticket-Bot'
                }
            });

            if (checkResponse.ok) {
                const existingFile = await checkResponse.json();
                existingSha = existingFile.sha;
            }
        } catch (e) {
            // File doesn't exist, which is fine
        }

        // Create or update file
        const requestBody = {
            message: `Ticket transcript: ${filename}`,
            content: base64Content,
            branch: github.branch || 'main'
        };

        if (existingSha) {
            requestBody.sha = existingSha;
        }

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${github.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Discord-Ticket-Bot'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API error:', errorData);
            return { success: false, error: errorData.message || 'GitHub API error' };
        }

        const data = await response.json();

        // Construct the raw file URL for direct viewing
        // Format: https://github.com/{owner}/{repo}/blob/{branch}/{path}
        const fileUrl = `https://github.com/${github.owner}/${github.repo}/blob/${github.branch || 'main'}/${filePath}`;

        // Alternative: Raw URL for direct download
        // const rawUrl = `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.branch || 'main'}/${filePath}`;

        return {
            success: true,
            url: fileUrl,
            htmlUrl: data.content?.html_url || fileUrl
        };

    } catch (error) {
        console.error('GitHub upload error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    uploadToGitHub
};
