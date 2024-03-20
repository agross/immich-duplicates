FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY ./ ./
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx

ENV NGINX_RESOLVER=127.0.0.11
ENV IMMICH_URL=https://immich.example.com
RUN mkdir -p /etc/nginx/templates
COPY ./nginx/immich-proxy.conf.template /etc/nginx/templates
