FROM node:22-alpine

WORKDIR /usr/src/app

# Install dependencies first so source-code changes don't
# invalidate the npm install layer.
COPY package*.json ./

RUN npm install --omit=dev

# Copy application source after dependencies.
COPY . .

# Run the application as the non-root node user.
USER node

EXPOSE 4500

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:4500/health || exit 1

CMD ["node", "server.js"]
