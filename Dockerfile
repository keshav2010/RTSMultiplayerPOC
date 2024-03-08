FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install -g webpack webpack-cli --force
RUN npm install -g tsx
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "deploy"]