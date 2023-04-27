FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
EXPOSE 3007
CMD ["npm", "start"]