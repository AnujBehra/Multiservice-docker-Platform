FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN chown -R node:node /usr/src/app
USER node

EXPOSE 4000

CMD ["npm", "start"]
