FROM node:20
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install
RUN npm install -g pm2@5.4.2
COPY . .
RUN npm run build
RUN ls -ltr
CMD ["npm", "run", "deploy"]
