# syntax=docker/dockerfile:1

# 1) Build the frontend. Same-origin deployment => VITE_API_URL empty => relative API calls.
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 2) Build the backend, embedding the frontend build as static resources.
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# 3) Runtime: a small JRE image serving both the SPA and the API.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/backend/target/*.jar app.jar
ENV MEMOCAT_STORAGE_PATH=/tmp/memocat-uploads
EXPOSE 8080
# Fits a 512 MB instance with room to spare (measured: ~300 MB at rest, ~330 MB
# serving many photos at once; the app itself needs ~50 MB of heap). The heap is
# capped at 40% (~200 MB); Serial GC, smaller thread stacks, a small code cache
# and the quick compiler only keep the rest of the process small. Above 512 MB
# the host kills the app (502/503 while it restarts). On an out-of-memory error,
# exit so the host restarts it instead of limping along.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=40", "-XX:+UseSerialGC", "-Xss512k", "-XX:ReservedCodeCacheSize=64m", "-XX:MaxMetaspaceSize=192m", "-XX:TieredStopAtLevel=1", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
