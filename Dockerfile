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
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
