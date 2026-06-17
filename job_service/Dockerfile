FROM node:20

WORKDIR /app

COPY package*.json .

COPY . .

RUN npm ci

RUN mkdir -p var/log

EXPOSE 5003

CMD ["npm", "run", "start:dev"]
