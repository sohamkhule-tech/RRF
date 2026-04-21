# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# CRITICAL: Remove any existing build cache before building
RUN rm -rf .next

# Build the Next.js app for production
RUN npm run build

# Expose Next.js port
EXPOSE 3000

# Start production server (uses the .next build)
CMD ["npm", "start"]
