# Sonarr Middleware for Korean TV Shows

## Introduction

This project is a custom middleware designed to enhance the functionality of Sonarr when dealing with Korean TV shows. It bridges the gap between Sonarr and indexers that list Korean TV series by their original Korean titles, ensuring seamless search and download operations.

## Background

Sonarr is an excellent tool for automating the downloading and organizing of TV shows. However, it primarily searches for series using their English titles, which poses a challenge when dealing with Korean TV shows listed under their original Korean names on indexers. This middleware addresses that issue by intercepting Sonarr's API calls and translating the English titles into their Korean counterparts before querying the indexers.

## Features

- Title Translation: Automatically translates English series titles to Korean before searching
- Seamless Integration: Acts as a transparent proxy between Sonarr and the indexer
- Environment Configuration: Utilizes a .env file for API keys and configuration settings
- Customizable: Easily adaptable to other languages or specific indexer requirements

## Prerequisites

- Node.js: Version 18 or higher (for native fetch support)
- Sonarr: Version 3 or higher
- Git: For cloning the repository

## Installation

1. Clone the Repository

```bash
git clone https://github.com/hcho112/docker-media-server.git
```

2. Navigate to the Project Directory

```bash
cd docker-media-server
```

3. Install Dependencies

```bash
npm install
```

4. Create Environment Configuration

```bash
cp .env.example .env
```

5. Configure Environment Variables

Open `.env` in a text editor and update the following variables:

```env
# Server Configuration
PORT=3000

# Sonarr Configuration
API_KEY=your_sonarr_api_key

# Indexer Configuration
INDEXER_API_URL=https://your.indexer.api/endpoint
INDEXER_API_KEY=your_indexer_api_key

# Download Directory
DOWNLOAD_DIR=/path/to/your/download/directory

# Optional: Translation API
TRANSLATION_API_KEY=your_translation_api_key

# Logging Level
LOG_LEVEL=info
```

6. Start the Middleware Server

```bash
npm start
```

## Sonarr Setup

### Configure Sonarr to Use the Middleware

1. Access Sonarr Settings
   - Open Sonarr in your web browser
   - Navigate to Settings > Indexers

2. Add a New Indexer
   - Click on + to add a new indexer
   - Choose Torznab as the indexer type

3. Indexer Configuration
   - Name: Enter a name (e.g., Korean TV Shows)
   - URL: Point to the middleware server (e.g., http://localhost:3000)
   - API Key: Use the API key configured in your .env file
   - Categories: Set appropriate categories for TV shows (e.g., 5000 for Korean TV shows)

4. Save and Test
   - Save the new indexer configuration
   - Click Test to ensure Sonarr can communicate with the middleware

### Adjust Sonarr Settings for Korean Content

1. Set Preferred Language
   - Go to Settings > Profiles
   - Create or edit a profile to prefer Korean language releases

2. Add Tags for Korean Shows
   - When adding a new series, add a tag like `korean` to ensure it uses the correct indexer and settings

3. Use Original Title When Searching
   - Navigate to Settings > Media Management
   - Enable "Use Original Title" when searching for series

## How It Works

The middleware intercepts Sonarr's API requests to the indexer. When a search request is made:

1. It extracts the English title from the request
2. Translates the title into Korean using a translation API or a predefined mapping
3. Replaces the title in the request with the Korean title
4. Forwards the modified request to the indexer
5. Receives the response from the indexer and passes it back to Sonarr

## Debugging

### Common Issues and Solutions

- **Middleware Not Running**
  - Ensure the middleware server is running by checking the terminal output
  - Restart the server with `npm start` if necessary

- **Sonarr Cannot Connect to Middleware**
  - Verify that the URL and port in Sonarr's indexer settings match the middleware server
  - Check for firewall settings that may block the connection

- **Translation Errors**
  - Ensure the translation API key (if used) is correctly set in the .env file
  - Check the middleware logs for any errors during the translation process

### Logging

- The middleware outputs logs to the console
- For more detailed logs, set `LOG_LEVEL=debug` in the .env file

## Contributing

Contributions are welcome! Please create a pull request with a detailed description of your changes.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Sonarr: For providing an excellent tool for managing TV shows
- Community Forums: Special thanks to the Sonarr community for their support and resources

## Contact

For questions or support, please open an issue on the GitHub repository.
