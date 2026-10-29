ARG REGISTRY
ARG NODE_VERSION=26
FROM ${REGISTRY}node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

COPY --chown=node:node app/router ./

RUN ["npm", "i", "--omit=dev"]
USER node:node
CMD ["node", "node_modules/@sap/approuter/approuter.js"]