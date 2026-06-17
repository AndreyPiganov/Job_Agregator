FROM node:16

WORKDIR /app

COPY package*.json .

COPY . .

RUN npm install

RUN mkdir -p var/log

EXPOSE 5003

CMD ["npm", "run", "start:dev"]
