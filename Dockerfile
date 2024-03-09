FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install webpack
RUN npm install webpack-cli
RUN npm install tsx
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]