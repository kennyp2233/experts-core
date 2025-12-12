FROM node:20-alpine

# Install dependencies for node-gyp (if needed) and openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./
COPY prisma ./prisma/
COPY scripts ./scripts/

# Copy source code (we need this for the scripts to run properly if they rely on other things, but usually scripts are standalone.
# However, to be safe and efficient, we copy scripts early.
# Actually, looking at the user request, they want the script to run.
# The script relies on 'child_process' and 'fs'. It uses 'prisma/...' paths.
# So we need prisma folder (already copied) and scripts folder.


# Install dependencies
RUN yarn install --frozen-lockfile

# Generate Prisma Client
RUN yarn prisma:generate

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose port (default NestJS)
EXPOSE 3000

# Start command (Run build here to ensure dist exists despite potential volume issues)
CMD ["sh", "-c", "yarn build && yarn start:prod"]
