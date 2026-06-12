FROM oven/bun:1.3

WORKDIR /app
COPY package.json tsconfig.json ./
RUN bun install --frozen-lockfile
COPY src/ ./src/
EXPOSE 4003
CMD ["bun", "run", "src/index.ts"]
