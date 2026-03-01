FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

COPY ./package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build

EXPOSE 80

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "80"]
