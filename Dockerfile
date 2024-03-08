FROM node:18
WORKDIR /rtsApp
COPY package*.json ./
RUN npm cache clean --force
RUN npm install -g webpack
RUN npm install -g webpack-cli
RUN npm install -g tsx
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "deploy"]