FROM node:20
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install
RUN npm install pm2 -g
COPY . .
CMD ["npm", "run", "deploy"]
