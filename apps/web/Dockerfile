FROM node:22-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

EXPOSE 5173

CMD ["sh", "-c", "pnpm install --frozen-lockfile --prod=false && pnpm --filter @exam-runner/web dev --host 0.0.0.0 --port 5173"]
