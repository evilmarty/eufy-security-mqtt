FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENTRYPOINT [ "node", "src/cli.js" ]
CMD [ "--help" ]

