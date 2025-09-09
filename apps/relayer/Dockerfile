# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install ALL dependencies (including dev dependencies for TypeScript build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies after build to keep image small
RUN npm prune --omit=dev

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
