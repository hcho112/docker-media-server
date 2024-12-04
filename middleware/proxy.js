const express = require('express');
const fs = require('fs');
const axios = require('axios');
const morgan = require('morgan');
const path = require('path');
const xml2js = require('xml2js');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const logDir = path.join(__dirname, 'logs');
const mappingFile = path.join(__dirname, 'title_mappings.json');

// Ensure directories exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Middleware for logging requests
const logFilePath = path.join(logDir, 'proxy.log');
app.use(morgan('combined', { stream: fs.createWriteStream(logFilePath, { flags: 'a' }) }));

// Sonarr API Configuration
const sonarrApiUrl = 'http://sonarr:8989/api/v3';
const sonarrApiKey = '9d73f8b3fe9f486784aadb2a813ccded';

// Title mappings storage
let titleMappings = [];

// Load mappings from JSON
async function loadMappings() {
    if (fs.existsSync(mappingFile)) {
        try {
            const data = fs.readFileSync(mappingFile, 'utf-8');
            titleMappings = JSON.parse(data);
            console.log('Title mappings loaded:', titleMappings);
        } catch (error) {
            console.error('Error parsing title_mappings.json:', error.message);
            titleMappings = [];
        }
    } else {
        console.warn(`Mapping file not found: ${mappingFile}`);
        titleMappings = [];
    }

    await ensureSeriesId();
}

// Fetch and fill missing `id` in mappings
async function ensureSeriesId() {
    try {
        const response = await axios.get(`${sonarrApiUrl}/series`, {
            headers: { 'X-Api-Key': sonarrApiKey },
        });

        const allSeries = response.data;

        titleMappings = titleMappings.map(mapping => {
            if (!mapping.id) {
                const series = allSeries.find(
                    s =>
                        s.title === mapping.englishTitle ||
                        mapping.aliases.includes(s.title) ||
                        s.alternateTitles.some(at => 
                            at.title === mapping.koreanTitle || mapping.aliases.includes(at.title)
                        )
                );

                if (series) {
                    console.log(`Found seriesId for "${mapping.englishTitle}": ${series.id}`);
                    return { ...mapping, id: series.id };
                } else {
                    console.warn(`Series not found in Sonarr for title "${mapping.englishTitle}"`);
                }
            }
            return mapping;
        });

        // Validate before saving
        if (Array.isArray(titleMappings) && titleMappings.length > 0) {
            fs.writeFileSync(mappingFile, JSON.stringify(titleMappings, null, 2), 'utf-8');
            console.log('Updated title mappings with seriesIds.');
        } else {
            console.error('No valid data to save to title_mappings.json.');
        }
    } catch (error) {
        console.error('Error fetching series from Sonarr:', error.message);
    }
}

// Fetch monitored episodes from Sonarr
async function getMonitoredEpisodes(seriesId) {
    try {
        console.log(`Fetching monitored episodes for seriesId: ${seriesId}`);
        const response = await axios.get(`${sonarrApiUrl}/episode`, {
            params: { seriesId },
            headers: { 'X-Api-Key': sonarrApiKey },
        });

        return response.data.filter(ep => ep.monitored);
    } catch (error) {
        console.error(`Error fetching monitored episodes for seriesId ${seriesId}:`, error.message);
        return [];
    }
}

function convertAirDate(inputDate) {
    // Convert the string to a Date object
    const date = new Date(inputDate);

    // Extract the year, month, and day
    const year = String(date.getFullYear()).slice(-2); // Last 2 digits of the year
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');

    // Concatenate the parts to get the desired format
    return `${year}${month}${day}`;
}

// Route to handle Torznab API requests
app.get('/torznab/api', async (req, res) => {
    const queryParams = { ...req.query };
    console.log('Received query params:', queryParams);

    const actionType = queryParams.t;

    // Directly forward "caps" and other non-search/download requests to Jackett
    if (!['search', 'tvsearch', 'download'].includes(actionType) || !queryParams.q) {
        console.log(`Bypassing custom logic for action type: ${actionType}`);
        try {
            const response = await axios.get('http://jackett:9117/api/v2.0/indexers/torrentsir/results/torznab/api', {
                params: queryParams,
            });
            return res.send(response.data);
        } catch (error) {
            console.error('Error forwarding request to Jackett:', error.message);
            return res.status(500).send('Proxy Error: Unable to forward request');
        }
    }

    console.log(`Applying custom logic for action type: ${actionType}`);

    // Custom logic for "search" and "download"
    try {
        const originalTitle = queryParams.q;
        if (!originalTitle) {
            console.error('Error: Missing title (q) in search/download request.');
            return res.status(400).send('Bad Request: Missing title parameter.');
        }

        const mappedTitle = titleMappings.find(
            mapping => mapping.englishTitle === originalTitle || mapping.aliases.includes(originalTitle)
        );

        if (!mappedTitle) {
            console.error(`Error: No mapping found for title "${originalTitle}".`);
            return res.status(404).send(`Mapping not found for title: "${originalTitle}"`);
        }

        queryParams.q = mappedTitle.koreanTitle;
        console.log(`Mapped title "${originalTitle}" to "${queryParams.q}"`);

        // Fetch monitored episodes
        const monitoredEpisodes = await getMonitoredEpisodes(mappedTitle.id);
        console.log('monitoredEpisodes', monitoredEpisodes);

        // Fetch results from Jackett and process them
        const response = await axios.get('http://jackett:9117/api/v2.0/indexers/torrentsir/results/torznab/api', {
            params: queryParams,
        });

        const originalResponse = response.data;

        const parser = new xml2js.Parser({ explicitArray: false });
        const builder = new xml2js.Builder();
        parser.parseString(originalResponse, (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err.message);
                return res.status(500).send('Proxy Error: Unable to parse XML');
            }

            // Modify titles based on monitored episodes
            if (result.rss && result.rss.channel && result.rss.channel.item) {
                const items = Array.isArray(result.rss.channel.item)
                    ? result.rss.channel.item
                    : [result.rss.channel.item];

                for (const item of items) {
                    const originalItemTitle = item.title;

                    const match = originalItemTitle.match(/E(\d{1,3})/)
                    if (match) {
                        const absoluteEpisode = parseInt(match[1], 10);
                        console.log('absoluteEpisode', absoluteEpisode);
                        // Match resolution dynamically (e.g., 720p, 1080p, 2160p)
                        const resolutionMatch = originalItemTitle.match(/(\d{3,4}p)/);
                        const resolution = resolutionMatch ? resolutionMatch[1] : 'unknown';

                        const monitoredEpisode = monitoredEpisodes.find(
                            ep => {
                                // use absolute episode if exist
                                return (ep.absoluteEpisodeNumber === absoluteEpisode)
                                // check if title contains absolute episode
                                || (ep.title.includes(absoluteEpisode))
                                // check if episode number is actual absolute number
                                || (ep.episodeNumber === absoluteEpisode)
                                //
                                || (originalItemTitle.includes(convertAirDate(ep.airDate)))
                            }
                        );
                        console.log('originalItemTitle', originalItemTitle);
                        console.log('monitoredEpisode', monitoredEpisode);
                        if (monitoredEpisode) {
                            const formattedTitle = `${mappedTitle.englishTitle}.S${monitoredEpisode.seasonNumber.toString().padStart(2, '0')}E${monitoredEpisode.episodeNumber.toString().padStart(2, '0')}.${resolution}`;
                            console.log(`Formatted title: "${originalItemTitle}" -> "${formattedTitle}"`);
                            item.title = formattedTitle;
                        } else {
                            console.log(`Episode ${absoluteEpisode} not found or not monitored in Sonarr.`);
                        }
                    } else {
                        console.log(`No absolute episode number found in title: "${originalItemTitle}"`);
                    }
                }
            }

            const modifiedResponse = builder.buildObject(result);
            return res.send(modifiedResponse);
        });
    } catch (error) {
        console.error('Error processing search/download request:', error.message);
        return res.status(500).send('Proxy Error');
    }
});

// Reload mappings and ensure seriesIds
app.get('/reload-mappings', async (req, res) => {
    await loadMappings();
    res.send('Mappings reloaded and updated with seriesIds.');
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Proxy middleware running on http://0.0.0.0:${PORT}`);
    await loadMappings(); // Ensure mappings are loaded on startup
});
