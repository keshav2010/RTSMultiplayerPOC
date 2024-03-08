FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install webpack webpack-cli
RUN npm install -g tsx
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "deploy"]