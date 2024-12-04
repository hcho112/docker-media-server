# Use Node.js 18 as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json, then install dependencies
COPY package*.json ./
RUN npm install

# Explicitly copy title_mappings.json first
COPY title_mappings.json /app/title_mappings.json

# Add a wait-for-it script to handle dependencies
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 3000

# Run the wait-for-it script and start the application
CMD ["./wait-for-it.sh", "sonarr:8989", "--", "node", "proxy.js"]
