FROM node:22-alpine
WORKDIR /app
COPY server.mjs ./
COPY vendor ./vendor
COPY assets ./assets
COPY index.html style.css app.js config.js ./
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
