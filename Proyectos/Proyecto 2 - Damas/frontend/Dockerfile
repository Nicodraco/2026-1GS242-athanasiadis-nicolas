FROM oven/bun:1.3 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["bun", "x", "serve", "dist", "-s", "-l", "3000"]
