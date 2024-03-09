FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install -g webpack webpack-cli npx
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "deploy"]
