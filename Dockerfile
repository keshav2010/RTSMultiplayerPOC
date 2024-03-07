FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm install -D -f webpack-cli
RUN npm install
RUN npm install -g tsx
RUN npm install -g webpack
COPY . .
EXPOSE 3000
CMD ["npm", "run", "deploy"]