FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# NEXT_PUBLIC vars are baked into the bundle at build time.
# Pass them via --build-arg in CI/CD; they have no effect at runtime.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUBDOMAIN=app
ARG NEXT_PUBLIC_ADMIN_ORIGIN
ARG NEXT_PUBLIC_TEACHER_ORIGIN
ARG NEXT_PUBLIC_STUDENT_ORIGIN
ARG NEXT_PUBLIC_LOGIN_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUBDOMAIN=$NEXT_PUBLIC_SUBDOMAIN
ENV NEXT_PUBLIC_ADMIN_ORIGIN=$NEXT_PUBLIC_ADMIN_ORIGIN
ENV NEXT_PUBLIC_TEACHER_ORIGIN=$NEXT_PUBLIC_TEACHER_ORIGIN
ENV NEXT_PUBLIC_STUDENT_ORIGIN=$NEXT_PUBLIC_STUDENT_ORIGIN
ENV NEXT_PUBLIC_LOGIN_URL=$NEXT_PUBLIC_LOGIN_URL

COPY . .
# Use next build directly — dotenv is only needed for local dev
RUN npx next build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p ./public
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
