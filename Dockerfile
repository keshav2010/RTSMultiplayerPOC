FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
EXPOSE 3007
EXPOSE 2567
CMD ["npm", "run", "deploy"]